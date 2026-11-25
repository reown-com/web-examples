// Drives Nimbus (v3/dapp, the app) and Ember (v3/wallet, the wallet) in the browser.
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  expect,
  type BrowserContext,
  type Page,
  type TestInfo,
} from "@playwright/test";

import { EMBER_URL, nimbusUrl } from "./stack";

const SCREENSHOTS = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "screenshots",
);

/** Attaches a screenshot to the report, and with SCREENSHOTS=1 saves it as screenshots/<name>.png. */
export async function shot(page: Page, testInfo: TestInfo, name: string) {
  const body = await page.screenshot();
  await testInfo.attach(name, { body, contentType: "image/png" });
  if (process.env.SCREENSHOTS) {
    mkdirSync(SCREENSHOTS, { recursive: true });
    await page.screenshot({ path: join(SCREENSHOTS, `${name}.png`) });
  }
}

/**
 * Opens Nimbus at `http://<host>:3000`, with App Signatures on or off for that host if given. With
 * them on, it also signs in to Nimbus (its backend signs only for a signed-in session, so signed
 * out the connection would go out unsigned), unless `signIn` is false.
 */
export async function openNimbus(
  context: BrowserContext,
  host: string,
  appSignature?: "on" | "off",
  { signIn = appSignature === "on" }: { signIn?: boolean } = {},
): Promise<Page> {
  const page = await context.newPage();
  await page.goto(
    `${nimbusUrl(host)}/${appSignature ? `?appSignature=${appSignature}` : ""}`,
  );
  await expect(page.locator("#connect")).toBeEnabled({ timeout: 30_000 });
  if (signIn) {
    const signOut = page.locator("#sign-out");
    const button = page.locator("#sign-in").first();
    await expect(signOut.or(button)).toBeVisible();
    if (!(await signOut.isVisible())) {
      // Signing in reloads the page, and the SDK starts again with signing on.
      await Promise.all([page.waitForEvent("load"), button.click()]);
      await expect(signOut).toBeVisible({ timeout: 30_000 });
      await expect(page.locator("#connect")).toBeEnabled({ timeout: 30_000 });
    }
  }
  if (appSignature)
    await expect(page.locator("#app-signature-toggle")).toHaveText(
      `App Signatures: ${appSignature}`,
    );
  return page;
}

/** Clicks Connect wallet: the connection URI, or the error Nimbus shows instead. */
export async function startConnect(
  nimbus: Page,
): Promise<{ uri?: string; error?: string }> {
  await nimbus.locator("#connect").click();
  const uri = nimbus.locator("#uri");
  const error = nimbus.locator(".sheet .callout.warn");
  await expect(uri.or(error)).toBeVisible({ timeout: 30_000 });
  if (await error.isVisible())
    return { error: (await error.innerText()).trim() };
  return { uri: (await uri.innerText()).trim() };
}

/** A Sign v2 only URI: without its Sign v3 parameters, a wallet pairs over Sign v2. */
export function v2Only(uri: string) {
  const [base, query] = uri.split("?");
  const params = new URLSearchParams(query);
  for (const k of [...params.keys()]) if (/^v3/.test(k)) params.delete(k);
  return `${base}?${params.toString()}`;
}

/** Opens Ember with Nimbus's "Open Ember Wallet" link for `uri`. */
export async function openEmber(
  context: BrowserContext,
  uri: string,
): Promise<Page> {
  const page = await context.newPage();
  await page.goto(`${EMBER_URL}/#uri=${encodeURIComponent(uri)}`);
  return page;
}

export interface Identity {
  /** The one-line name: the reviewed name, else the domain, else "Unverified app". */
  title: string;
  /** The domain under the name, when there's a name. */
  domain?: string;
  verified: boolean;
  scam: boolean;
  /** "Nothing confirms who sent this": no domain at all. */
  unsigned: boolean;
}

/** Who Ember says sent the open proposal or request. */
export async function identity(ember: Page): Promise<Identity> {
  const id = ember.locator(".sheet #app-identity").last();
  await expect(id).toBeVisible({ timeout: 30_000 });
  const domain = id.locator(".from");
  return {
    title: (await id.locator("h3").innerText()).trim(),
    domain: (await domain.count())
      ? (await domain.innerText()).trim()
      : undefined,
    verified: await id.locator("#verified-badge").isVisible(),
    scam: await id.locator("#scam-warning").isVisible(),
    unsigned: await id.getByText("Nothing confirms who sent this").isVisible(),
  };
}

/** Approves Ember's open proposal and waits for Nimbus to show the session. */
export async function approve(ember: Page, nimbus: Page) {
  await ember.locator("#approve").click();
  await expect(nimbus.locator("#account")).toBeVisible({ timeout: 30_000 });
}

/** Nimbus → Ember: connect and return Ember's page at the proposal (not approved). */
export async function proposal(
  context: BrowserContext,
  nimbus: Page,
  uriTransform = (u: string) => u,
) {
  const { uri, error } = await startConnect(nimbus);
  if (!uri) throw new Error(`Nimbus couldn't connect: ${error}`);
  const ember = await openEmber(context, uriTransform(uri));
  await expect(ember.locator("#approve")).toBeVisible({ timeout: 30_000 });
  return ember;
}

/** Sends "Sign message" from Nimbus. */
export async function requestSignature(nimbus: Page, message: string) {
  await nimbus.locator("#message").fill(message);
  await nimbus.locator("#submit").click();
}

/** The latest entry in Nimbus's activity list. */
export const lastActivity = (nimbus: Page) =>
  nimbus.locator("#activity > *").first();
