// Each status a wallet shows, from Nimbus on the stack's seeded domains to Ember:
// Business verified, Domain verified, Default (unverified), Security risk, and the refusal of an
// unsigned app on a domain that requires App Signatures.
import { expect, test } from "@playwright/test";

import {
  approve,
  identity,
  openNimbus,
  proposal,
  requestSignature,
  shot,
  startConnect,
} from "../lib/apps";
import { DOMAINS, setBusinessVerified, VERIFIED_NAME } from "../lib/stack";

test.describe("each status in the wallet", () => {
  test.afterEach(() => setBusinessVerified(false));

  test("Business verified: app.localhost, with its reviewed name and the checkmark", async ({
    context,
  }, testInfo) => {
    await setBusinessVerified(true);
    const nimbus = await openNimbus(context, DOMAINS.businessVerified, "on");
    const ember = await proposal(context, nimbus);
    expect(await identity(ember)).toEqual({
      title: VERIFIED_NAME,
      domain: DOMAINS.businessVerified,
      verified: true,
      scam: false,
      unsigned: false,
    });
    await shot(ember, testInfo, "status-business-verified-proposal");
    await approve(ember, nimbus);

    // Every request carries it too, not only the connection.
    await requestSignature(nimbus, "Hello from Nimbus");
    await expect(ember.locator("#confirm")).toBeVisible();
    expect(await identity(ember)).toMatchObject({
      title: VERIFIED_NAME,
      verified: true,
    });
    await shot(ember, testInfo, "status-business-verified-request");
  });

  test("Domain verified: other.localhost, the domain only", async ({
    context,
  }, testInfo) => {
    const nimbus = await openNimbus(context, DOMAINS.domainVerified, "on");
    const ember = await proposal(context, nimbus);
    expect(await identity(ember)).toEqual({
      title: DOMAINS.domainVerified,
      domain: undefined,
      verified: false,
      scam: false,
      unsigned: false,
    });
    await shot(ember, testInfo, "status-domain-verified");
  });

  test('Default: unknown.localhost, unsigned, shown as "Unverified app"', async ({
    context,
  }, testInfo) => {
    const nimbus = await openNimbus(context, DOMAINS.unknown, "off");
    const ember = await proposal(context, nimbus);
    expect(await identity(ember)).toEqual({
      title: "Unverified app",
      domain: undefined,
      verified: false,
      scam: false,
      unsigned: true,
    });
    // Nimbus's own name, URL and icon are never shown.
    await expect(ember.locator(".sheet")).not.toContainText("Nimbus");
    await shot(ember, testInfo, "status-default-unverified");
  });

  test('Security risk: scam.localhost, signed, with the "Known scam" warning', async ({
    context,
  }, testInfo) => {
    const nimbus = await openNimbus(context, DOMAINS.scam, "on");
    const ember = await proposal(context, nimbus);
    expect(await identity(ember)).toMatchObject({
      title: DOMAINS.scam,
      scam: true,
      verified: false,
    });
    await shot(ember, testInfo, "status-security-risk");
  });

  test("Requires signatures with signed connections: unsigned Nimbus on strict.new.localhost is refused, and Ember gets nothing", async ({
    context,
  }, testInfo) => {
    const nimbus = await openNimbus(context, DOMAINS.strict, "off");
    const started = Date.now();
    const { uri, error } = await startConnect(nimbus);
    expect(uri).toBeUndefined();
    expect(error).toContain("this domain requires App Signatures");
    // At once, not after retries.
    expect(Date.now() - started).toBeLessThan(10_000);
    await shot(nimbus, testInfo, "status-requires-signatures-refused");

    // Signed, the same domain connects.
    const signed = await openNimbus(context, DOMAINS.strict, "on");
    const ember = await proposal(context, signed);
    expect(await identity(ember)).toMatchObject({
      title: DOMAINS.strict,
      unsigned: false,
    });
  });

  test("Requires signatures on requests only: unsigned Nimbus on required.localhost connects with no app identity", async ({
    context,
  }, testInfo) => {
    // requireSignedConnections is off there: the relay delivers the unsigned connection request
    // without app identity (later requests must be signed: exploits-fail.spec.ts).
    const nimbus = await openNimbus(context, DOMAINS.required, "off");
    const ember = await proposal(context, nimbus);
    expect(await identity(ember)).toMatchObject({
      title: "Unverified app",
      verified: false,
      unsigned: true,
    });
    await shot(
      ember,
      testInfo,
      "status-requires-signatures-unsigned-connection",
    );
  });
});
