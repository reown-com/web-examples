// The upgrade flow: a new app starts unknown (Default), publishes its domain file, its organization
// adds and refreshes the domain in the WalletConnect Dashboard (Domain verified), and WalletConnect's
// review raises the tier (Business verified). Ember is checked at each step.
//
// The Dashboard steps need DASHBOARD_PASSWORD (and DASHBOARD_EMAIL, default
// agent@walletconnect.invalid) for the local Dashboard; without them the test refreshes through
// the organization API, as the Dashboard does. WalletConnect's review has no API yet: the
// organization service's local development control (PUT /local-dev/domains/{domain}/facts) stands
// in for it.
import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";

import {
  identity,
  openEmber,
  openNimbus,
  shot,
  startConnect,
  type Identity,
} from "../lib/apps";
import { Dashboard, dashboardCredentials } from "../lib/dashboard";
import {
  freshDomain,
  keys,
  publishDocument,
  refreshDomain,
  setFacts,
  unpublishDocument,
} from "../lib/stack";

const NAME = "Shop on Nimbus";
const ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%2316a34a'/%3E%3Ctext x='32' y='44' font-size='34' text-anchor='middle'%3E%F0%9F%9B%8D%3C/text%3E%3C/svg%3E";

/**
 * Connects Nimbus on `host` to a fresh Ember until Ember shows `expected` (the relay caches what
 * the organization service says for up to ~10 s). Returns Ember's page at the proposal. Each try
 * is a new browser context, so no Ember tab left open takes the proposal first.
 */
let open: BrowserContext | undefined;
async function emberShows(
  browser: Browser,
  host: string,
  appSignature: "on" | "off",
  expected: Partial<Identity>,
): Promise<Page> {
  let last: Identity | string | undefined;
  for (let attempt = 0; attempt < 12; attempt++) {
    await open?.close();
    open = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const nimbus = await openNimbus(open, host, appSignature);
    const { uri, error } = await startConnect(nimbus);
    if (uri) {
      const ember = await openEmber(open, uri);
      await expect(ember.locator("#approve")).toBeVisible();
      last = await identity(ember);
      if (Object.entries(expected).every(([k, v]) => (last as any)[k] === v))
        return ember;
    } else last = error;
    await new Promise((r) => setTimeout(r, 2_000));
  }
  throw new Error(
    `Ember never showed ${JSON.stringify(expected)}; last: ${JSON.stringify(last)}`,
  );
}

/** Nimbus's page on `host`, with its App Signatures switch in the top bar. */
async function nimbusShot(
  context: BrowserContext,
  host: string,
  appSignature: "on" | "off",
  testInfo: any,
  name: string,
) {
  const nimbus = await openNimbus(context, host, appSignature);
  await shot(nimbus, testInfo, name);
  await nimbus.close();
}

test("walk an app up: Default → Domain verified → Business verified (→ Security risk)", async ({
  browser,
  context,
}, testInfo) => {
  const domain = freshDomain("shop");
  const viaDashboard = !!dashboardCredentials();
  testInfo.annotations.push({
    type: "refresh",
    description: viaDashboard
      ? "through the Dashboard"
      : "through the organization API (no DASHBOARD_PASSWORD)",
  });
  const dashboard = viaDashboard ? await Dashboard.signIn(browser) : undefined;
  try {
    // 1. A new app, unsigned: Default.
    let ember = await emberShows(browser, domain, "off", {
      title: "Unverified app",
      unsigned: true,
    });
    await shot(ember, testInfo, "upgrade-1-default");
    await nimbusShot(
      context,
      domain,
      "off",
      testInfo,
      "upgrade-1-nimbus-signatures-off",
    );

    // 2. It publishes its domain file: the organization's verification ID and its public key.
    publishDocument(domain, [keys.app.publicJwk]);
    const file = await context.newPage();
    await file.goto(`http://${domain}:8399/.well-known/wc-domain-verify.json`);
    await expect(file.locator("body")).toContainText("allowed_organizations");
    await shot(file, testInfo, "upgrade-2-domain-file");

    // 3. The organization adds the domain and refreshes it.
    if (dashboard) {
      await dashboard.addDomain(domain);
      await shot(dashboard.page, testInfo, "upgrade-3-dashboard-domain-added");
      await expect(dashboard.allowlistRow(domain)).toContainText(
        "Not verified",
      );
      const status = await dashboard.openVerification(domain);
      await expect(status).toContainText("Not verified");
      await shot(dashboard.page, testInfo, "upgrade-4-dashboard-not-verified");
      await dashboard.refresh(domain);
      await expect(status).toContainText("Verified");
      await expect(status).toContainText(keys.app.kid);
      await expect(dashboard.requireSignatures()).toBeEnabled();
      await shot(dashboard.page, testInfo, "upgrade-5-dashboard-verified");
    } else {
      expect((await refreshDomain(domain)).body.status).toBe("verified");
    }

    // 4. Nimbus signs (it deploys its signing backend): Domain verified, the domain only.
    ember = await emberShows(browser, domain, "on", {
      title: domain,
      unsigned: false,
      verified: false,
    });
    expect(await identity(ember)).toMatchObject({
      domain: undefined,
      scam: false,
    });
    await shot(ember, testInfo, "upgrade-6-domain-verified");
    await nimbusShot(
      context,
      domain,
      "on",
      testInfo,
      "upgrade-6-nimbus-signatures-on",
    );

    // 5. WalletConnect reviews the business: the tier goes up, with the reviewed name and icon.
    await setFacts(domain, { tier: "verified", name: NAME, icon: ICON });
    ember = await emberShows(browser, domain, "on", {
      title: NAME,
      domain,
      verified: true,
    });
    await shot(ember, testInfo, "upgrade-7-business-verified");

    // 6. Later, WalletConnect flags it as a scam: the warning shows on top of the tier.
    await setFacts(domain, {
      tier: "verified",
      name: NAME,
      icon: ICON,
      isScam: true,
    });
    ember = await emberShows(browser, domain, "on", {
      title: NAME,
      scam: true,
    });
    await shot(ember, testInfo, "upgrade-8-security-risk");
  } finally {
    await open?.close();
    open = undefined;
    await setFacts(domain, {}).catch(() => {});
    unpublishDocument(domain);
    if (dashboard) {
      if (!process.env.KEEP_DASHBOARD_DOMAINS)
        await dashboard.removeDomain(domain).catch(() => {});
      await dashboard.page.close();
    }
  }
});
