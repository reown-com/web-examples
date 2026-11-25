// What an organization allowed on a domain can do about changes it didn't make, from the
// Dashboard's verification page: contest a held key (the hold is cancelled, and the key needs a
// new refresh and a new 24-hour hold), and confirm that an organization the domain dropped left on
// purpose (it is no longer told about the domain).
//
// Needs DASHBOARD_PASSWORD for the local Dashboard. Each test refreshes its domain more than once,
// so it waits out the one-refresh-a-minute limit (the removal twice).
import { expect, test } from "@playwright/test";

import { Dashboard, dashboardCredentials } from "../lib/dashboard";
import {
  createOrganization,
  DOMAIN_VERIFICATION_ID,
  domainRecord,
  freshDomain,
  keys,
  publishDocument,
  refreshDomain,
  refreshDomainAs,
  setKeyHold,
  unpublishDocument,
} from "../lib/stack";

test.describe("changes on a domain, from the Dashboard", () => {
  test.skip(!dashboardCredentials(), "needs DASHBOARD_PASSWORD");
  test.setTimeout(300_000);

  test.afterEach(async () => {
    await setKeyHold(0);
  });

  test("contest a held key: it's cancelled, and the domain keeps only its active key", async ({
    browser,
  }, testInfo) => {
    const domain = freshDomain("contest");
    const dashboard = await Dashboard.signIn(browser);
    try {
      await setKeyHold(0);
      publishDocument(domain, [keys.app.publicJwk]);
      await dashboard.addDomain(domain);
      expect((await refreshDomain(domain)).body.status).toBe("verified");

      // A new key appears on the domain, and is held.
      await setKeyHold(3_600);
      publishDocument(domain, [keys.app.publicJwk, keys.other.publicJwk]);
      const held = await refreshDomain(domain);
      expect(held.status, JSON.stringify(held.body)).toBe(200);

      await dashboard.openVerification(domain);
      const changes = dashboard.changes();
      await expect(changes).toContainText(`New key ${keys.other.kid}`);
      await testInfo.attach("changes", {
        body: await dashboard.page.screenshot(),
        contentType: "image/png",
      });
      await dashboard.confirmChange(
        `Contest key ${keys.other.kid}`,
        "Contest key",
        "Hold cancelled",
      );
      await expect(changes).toHaveCount(0);

      const record = await domainRecord(domain);
      expect(record.keys.map((k: any) => k.kid)).toEqual([keys.app.kid]);
      expect(record.status).toBe("verified");
    } finally {
      await dashboard.removeDomain(domain).catch(() => undefined);
      await dashboard.page.close();
      unpublishDocument(domain);
    }
  });

  test("confirm a removal: the organization that left is no longer told about the domain", async ({
    browser,
  }) => {
    const domain = freshDomain("removal");
    const agency = createOrganization("E2E agency");
    const dashboard = await Dashboard.signIn(browser);
    try {
      await setKeyHold(0);
      // The agency verifies the domain, then the owner joins it.
      publishDocument(domain, [keys.app.publicJwk], {
        organizations: [agency.domainVerificationId, DOMAIN_VERIFICATION_ID],
      });
      const joined = await refreshDomainAs(agency.organizationId, domain);
      expect(
        joined.body.allowedOrganizationIds,
        JSON.stringify(joined.body),
      ).toEqual([agency.organizationId]);
      await dashboard.addDomain(domain);
      expect(
        (await refreshDomain(domain)).body.allowedOrganizationIds,
      ).toContain(agency.organizationId);
      // The owner stops working with the agency: its own refresh with a document that names
      // only the owner removes it (deliberately; a re-check finding that would block the domain).
      publishDocument(domain, [keys.app.publicJwk], {
        organizations: [DOMAIN_VERIFICATION_ID],
      });
      const refreshed = await refreshDomain(domain);
      expect(
        refreshed.body.formerOrganizations,
        JSON.stringify(refreshed.body),
      ).toEqual([
        expect.objectContaining({ organizationId: agency.organizationId }),
      ]);
      expect(refreshed.body.blocked).toBeNull();

      await dashboard.openVerification(domain);
      await expect(dashboard.changes()).toContainText(
        `Organisation ${agency.organizationId} left`,
      );
      await dashboard.confirmChange(
        `Confirm removal ${agency.organizationId}`,
        "Confirm removal",
        "Removal confirmed",
      );
      await expect(dashboard.changes()).toHaveCount(0);
      expect((await domainRecord(domain)).formerOrganizations).toEqual([]);
    } finally {
      await dashboard.removeDomain(domain).catch(() => undefined);
      await dashboard.page.close();
      unpublishDocument(domain);
    }
  });
});
