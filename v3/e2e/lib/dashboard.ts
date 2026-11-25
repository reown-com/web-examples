// Drives the WalletConnect Dashboard (wc-web-monorepo apps/dashboard, `pnpm dev`) against the local
// organization service: the project's Domains allowlist, and each domain's verification page,
// opened from its row's menu.
import { expect, type Browser, type Page } from "@playwright/test";

import { DASHBOARD_URL } from "./stack";

/** Sign-in for the local Dashboard: DASHBOARD_EMAIL and DASHBOARD_PASSWORD (never committed). */
export const dashboardCredentials = () =>
  process.env.DASHBOARD_PASSWORD
    ? {
        email: process.env.DASHBOARD_EMAIL ?? "agent@walletconnect.invalid",
        password: process.env.DASHBOARD_PASSWORD,
      }
    : undefined;

export class Dashboard {
  private constructor(
    readonly page: Page,
    /** The signed-in project's URL, `/<team>/app/<project>`. */
    readonly app: string,
  ) {}

  static async signIn(browser: Browser) {
    const credentials = dashboardCredentials();
    if (!credentials) throw new Error("DASHBOARD_PASSWORD is not set");
    const page = await browser.newPage({
      viewport: { width: 1400, height: 1000 },
    });
    await page.goto(`${DASHBOARD_URL}/sign-in`);
    await page.waitForSelector("[data-hydrated]", { state: "attached" });
    const email = page.locator("input[name=email]");
    // The form only works once hydrated: retry until the fields take input.
    await expect(async () => {
      await email.fill(credentials.email);
      await expect(email).toHaveValue(credentials.email, { timeout: 1_000 });
    }).toPass({ timeout: 30_000 });
    await page.locator("input[name=password]").fill(credentials.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"), {
      timeout: 60_000,
    });
    await expect(page).toHaveURL(/\/app\/[0-9a-f-]+/, { timeout: 60_000 });
    const app = new URL(page.url()).pathname.match(/^\/[^/]+\/app\/[^/]+/)![0];
    return new Dashboard(page, `${DASHBOARD_URL}${app}`);
  }

  private async open(path: string) {
    await this.page.goto(`${this.app}${path}`);
    // The app marks the document once React has attached its handlers; a dev server's open
    // connections can keep "networkidle" from ever arriving.
    await this.page.waitForSelector("[data-hydrated]", { state: "attached" });
  }

  /** Configuration → Domains: adds `https://<domain>` to the project's allowlist. */
  async addDomain(domain: string) {
    await this.open("/configuration/domains");
    await this.page.getByPlaceholder("example.com").fill(`https://${domain}`);
    await this.page.getByRole("button", { name: "Add domain" }).click();
    await expect(
      this.page.getByText(`https://${domain}`, { exact: true }),
    ).toBeVisible();
  }

  /** Removes `https://<domain>` from the allowlist again. */
  async removeDomain(domain: string) {
    await this.open("/configuration/domains");
    const box = this.page.getByRole("checkbox", {
      name: `Select https://${domain}`,
    });
    if (!(await box.count())) return;
    await box.check({ force: true });
    await this.page.getByRole("button", { name: "Delete" }).first().click();
    await this.page.getByRole("button", { name: "Delete domain" }).click();
    await expect(
      this.page.getByText(`https://${domain}`, { exact: true }),
    ).toHaveCount(0);
  }

  /** The domain's row in Configuration's Domains allowlist, with its status badge. */
  allowlistRow(domain: string) {
    return this.page.getByRole("listitem").filter({
      has: this.page.getByText(`https://${domain}`, { exact: true }),
    });
  }

  /**
   * Opens the domain's verification page from its row's menu ("Verify domain", or "Domain
   * verification" once verified) and returns its Status section.
   */
  async openVerification(domain: string) {
    await this.open("/configuration");
    await this.page
      .getByRole("button", {
        name: `More actions for https://${domain}`,
        exact: true,
      })
      .click();
    await this.page
      .getByRole("menuitem", { name: /^(Verify domain|Domain verification)$/ })
      .click();
    await expect(
      this.page.getByRole("heading", { name: domain, exact: true }),
    ).toBeVisible();
    return this.page.getByRole("region", { name: "Status", exact: true });
  }

  /** Presses Refresh on the domain's verification page and waits for the check to answer. */
  async refresh(domain: string) {
    const status = await this.openVerification(domain);
    await status.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(
      this.page
        .getByText(/Domain verification refreshed|Couldn't verify the domain/)
        .first(),
    ).toBeVisible();
    return status;
  }

  /** The domain's Require App Signatures switch, on its verification page. */
  requireSignatures() {
    return this.page.getByRole("switch", { name: /Require App Signatures/ });
  }
}
