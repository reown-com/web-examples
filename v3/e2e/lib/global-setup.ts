import {
  EMBER_URL,
  nimbusUrl,
  ORGANIZATION_URL,
  RELAY_URL,
  setBusinessVerified,
  setProjectReview,
  STACK_DIR,
  VERIFIED_ICON,
  VERIFIED_NAME,
} from "./stack";

/** Fails early, and clearly, when something the tests need isn't running. */
export default async function globalSetup() {
  const need: [string, string][] = [
    ["the relay (up.sh)", `${RELAY_URL}/health`],
    ["the organization service (up.sh)", `${ORGANIZATION_URL}/health`],
    [
      "its local development controls (pay-core#2288 with ORGANIZATION_LOCAL_DEV)",
      `${ORGANIZATION_URL}/local-dev/facts`,
    ],
    ["Nimbus (cd v3/dapp && pnpm dev)", `${nimbusUrl("localhost")}/`],
    ["Ember (cd v3/wallet && pnpm dev)", `${EMBER_URL}/`],
  ];
  const missing: string[] = [];
  for (const [what, url] of need) {
    // The relay's /health answers 500 when the host's free memory is low: any answer will do.
    const status = await fetch(url).then(
      (r) => r.status,
      () => 0,
    );
    if (status === 0 || status === 404)
      missing.push(`${what}: ${url} (${status || "no answer"})`);
  }
  if (missing.length)
    throw new Error(
      `Not running (stack: ${STACK_DIR}):\n  ${missing.join("\n  ")}`,
    );
  // The review covers every domain the organization signs for (its business and its project),
  // so it starts off: the tests that show Business verified turn it on.
  await setProjectReview(VERIFIED_NAME, VERIFIED_ICON);
  await setBusinessVerified(false, { force: true });
}
