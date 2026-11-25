import { defineConfig } from "@playwright/test";

// End-to-end tests of Verify v4 in the browser: Nimbus (v3/dapp) and Ember (v3/wallet) against
// rs-relay's local stack (scripts/verify-v4-local). Start the stack, both apps (`pnpm dev`) and,
// for the Dashboard steps, the WalletConnect Dashboard first. See README.md in v3/.
export default defineConfig({
  testDir: "tests",
  // One at a time: the tests share the stack, and some change its key hold.
  workers: 1,
  fullyParallel: false,
  timeout: 180_000,
  expect: { timeout: 30_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./lib/global-setup.ts",
  use: {
    headless: true,
    viewport: { width: 1280, height: 900 },
    // Chrome resolves *.localhost to this machine already; this is for other resolvers.
    launchOptions: {
      args: ["--host-resolver-rules=MAP *.localhost 127.0.0.1"],
    },
    trace: "retain-on-failure",
  },
});
