// Drives the WalletConnect Dashboard (wc-web-monorepo apps/dashboard, `pnpm dev`) against the local
// organization service: the project's Domains allowlist and its "Domain verification" section.
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
    await page.waitForLoadState("networkidle");
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
    await this.page.waitForLoadState("networkidle");
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

  /** The domain's row in Configuration's "Domain verification" section. */
  verificationRow(domain: string) {
    return this.page
      .locator("li")
      .filter({ has: this.page.getByText(domain, { exact: true }) })
      .filter({
        has: this.page.getByRole("button", {
          name: "Refresh domain verification",
        }),
      });
  }

  async openVerification(domain: string) {
    await this.open("/configuration");
    const row = this.verificationRow(domain);
    await row.scrollIntoViewIfNeeded();
    return row;
  }

  /** Presses "Refresh domain verification" and waits for the row's status to change. */
  async refresh(domain: string) {
    const row = await this.openVerification(domain);
    await row
      .getByRole("button", { name: "Refresh domain verification" })
      .click();
    await expect(
      row.getByText(/Verified|Not set up|Pending|Held/).first(),
    ).toBeVisible();
    return row;
  }
}
