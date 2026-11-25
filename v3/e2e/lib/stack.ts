// The local Verify v4 stack (rs-relay's scripts/verify-v4-local) these tests run against: where it
// is, its keys, and the organization service's API and local development controls.
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/** rs-relay's scripts/verify-v4-local. Defaults to an rs-relay checkout next to web-examples. */
export const STACK_DIR = resolve(
  process.env.VERIFY_V4_LOCAL ??
    join(here, "../../../../rs-relay/scripts/verify-v4-local"),
);
const STATE = join(STACK_DIR, ".state");

function readEnv(file: string): Record<string, string> {
  if (!existsSync(file))
    throw new Error(
      `${file} not found: start the stack (rs-relay scripts/verify-v4-local/up.sh) and set VERIFY_V4_LOCAL to that directory`,
    );
  return Object.fromEntries(
    readFileSync(file, "utf8")
      .split("\n")
      .filter((l) => /^[A-Z_]+=/.test(l))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
  );
}

export const stack = readEnv(join(STATE, "stack.env"));
export const RELAY_URL = stack.RELAY_URL;
export const PROJECT_ID = stack.PROJECT_ID;
export const ORGANIZATION_ID = stack.ORGANIZATION_ID;
export const DOMAIN_VERIFICATION_ID = stack.DOMAIN_VERIFICATION_ID;
/** The organization API as the WalletConnect Dashboard calls it (through the local gateway). */
export const ORGANIZATION_API = stack.ORGANIZATION_API_DASHBOARD;
/** The organization service itself, for its local development controls (`/local-dev/*`). */
export const ORGANIZATION_URL =
  process.env.ORGANIZATION_URL ?? "http://127.0.0.1:8400";

export const NIMBUS_PORT = Number(process.env.NIMBUS_PORT ?? 3000);
export const EMBER_URL = process.env.EMBER_URL ?? "http://localhost:3001";
export const DASHBOARD_URL =
  process.env.DASHBOARD_URL ?? "http://localhost:5173";
export const nimbusUrl = (host: string) => `http://${host}:${NIMBUS_PORT}`;

export interface Key {
  kid: string;
  privateJwk: JsonWebKey & { kid?: string };
  publicJwk: JsonWebKey & { kid?: string };
}
/** The stack's throwaway keys: `app` (published by app, required, scam and other.localhost),
 * `other` (other.localhost's own) and `wrong` (published by no domain). */
export const keys = JSON.parse(
  readFileSync(join(STATE, "keys.json"), "utf8"),
) as Record<"app" | "other" | "wrong", Key>;

/** What the seeded domains are (up.sh). */
export const DOMAINS = {
  businessVerified: "app.localhost",
  domainVerified: "other.localhost",
  unknown: "unknown.localhost",
  scam: "scam.localhost",
  required: "required.localhost",
} as const;
export const VERIFIED_NAME = "Verify v4 E2E";

/** A fresh domain under `*.new.localhost`, which Nimbus can sign for (NEXT_PUBLIC_APP_SIGNATURE_DOMAINS). */
export const freshDomain = (label: string) =>
  `${label}-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}.new.localhost`;

const wellKnown = (domain: string) =>
  join(STATE, "well-known", `${domain}.json`);

/**
 * Publishes `domain`'s /.well-known/wc-domain-verify.json, naming the stack's organization (or
 * the given domain verification IDs instead).
 */
export function publishDocument(
  domain: string,
  publicJwks: JsonWebKey[],
  {
    organizations = [DOMAIN_VERIFICATION_ID],
  }: { organizations?: string[] } = {},
) {
  const doc = {
    allowed_organizations: organizations,
    allowed_projects: [PROJECT_ID],
    keys: publicJwks,
  };
  writeFileSync(wellKnown(domain), JSON.stringify(doc, null, 2));
  return doc;
}

export function unpublishDocument(domain: string) {
  rmSync(wellKnown(domain), { force: true });
}

async function call(url: string, init: RequestInit = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await res.text();
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

const domainsApi = `${ORGANIZATION_API}/v1/organizations/${ORGANIZATION_ID}/domains`;

/**
 * What the Dashboard's "Refresh domain verification" does, through the organization API. Refresh
 * is limited to one per domain per minute (429); by default this waits that out and refreshes
 * again, so a test can refresh a domain twice (`waitForLimit: false` returns the 429).
 */
export async function refreshDomain(
  domain: string,
  { waitForLimit = true }: { waitForLimit?: boolean } = {},
) {
  const deadline = Date.now() + 75_000;
  for (;;) {
    const r = await call(`${domainsApi}/${domain}/refresh`, { method: "POST" });
    if (r.status !== 429 || !waitForLimit || Date.now() > deadline) return r;
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
}

/**
 * Refresh as another organization (one `createOrganization` made), through the same API the
 * Dashboard calls, waiting out the one-refresh-a-minute limit as `refreshDomain` does.
 */
export async function refreshDomainAs(organizationId: string, domain: string) {
  const deadline = Date.now() + 75_000;
  for (;;) {
    const r = await call(
      `${ORGANIZATION_API}/v1/organizations/${organizationId}/domains/${domain}/refresh`,
      { method: "POST" },
    );
    if (r.status !== 429 || Date.now() > deadline) return r;
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
}

/**
 * Seeds another organization (a fresh key, name and project ID) with up.sh's `local_seed`, the
 * only way to create one locally: the service doesn't serve its create endpoints yet.
 */
export function createOrganization(name: string): {
  organizationId: string;
  domainVerificationId: string;
} {
  const seed = join(STATE, "target/pay-core/debug/examples/local_seed");
  const suffix = randomBytes(8).toString("hex");
  const out = execFileSync(
    seed,
    [`e2e-organization:${suffix}`, name, randomBytes(16).toString("hex")],
    {
      env: {
        ...process.env,
        ORGANIZATION_DYNAMODB_ENDPOINT:
          process.env.FLOCI_URL ?? "http://localhost:4566",
        ORGANIZATION_DYNAMODB_TABLE:
          process.env.ORGANIZATION_TABLE ?? "local-organization",
        AWS_ACCESS_KEY_ID: "test",
        AWS_SECRET_ACCESS_KEY: "test",
        AWS_REGION: "eu-central-1",
      },
      encoding: "utf8",
    },
  );
  return JSON.parse(out.trim().split("\n").pop()!);
}

/** The organization's domains as the Dashboard sees them. */
export async function domainRecord(domain: string): Promise<any> {
  const { body } = await call(domainsApi);
  return (body?.domains ?? []).find((d: any) => d.domain === domain);
}

export const setRequireSignatures = (domain: string, enabled: boolean) =>
  call(`${domainsApi}/${domain}/require-signatures`, {
    method: "PUT",
    body: JSON.stringify({ enabled }),
  });

// The organization service's local development controls (pay-core services/organization
// src/local_dev.rs). They exist only with ORGANIZATION_LOCAL_DEV=true.

export interface DomainFacts {
  tier?: "verified" | "domain_verified";
  name?: string;
  icon?: string;
  isScam?: boolean;
  isSimilarTo?: string;
}

/**
 * Stands in for WalletConnect's review and scam data: sets a domain's tier, name, icon or scam flag.
 * A review (tier, name, icon) is bound to the domain's first allowed organization, so set it only
 * once the domain is refreshed (409 before); a change of the domain's keys or allowed
 * organizations clears it. A flag refuses the domain's first Refresh (422 domain_flagged).
 */
export async function setFacts(domain: string, facts: DomainFacts) {
  const r = await call(
    `${ORGANIZATION_URL}/local-dev/domains/${domain}/facts`,
    {
      method: "PUT",
      body: JSON.stringify(facts),
    },
  );
  if (r.status !== 200)
    throw new Error(
      `set facts for ${domain}: ${r.status} ${JSON.stringify(r.body)}`,
    );
}

/** Holds new keys `seconds` before they're valid, with the hold's checks spread over it (0: none). */
export async function setKeyHold(seconds: number) {
  const r = await call(`${ORGANIZATION_URL}/local-dev/key-hold`, {
    method: "PUT",
    body: JSON.stringify({ seconds }),
  });
  if (r.status !== 200)
    throw new Error(`set key hold: ${r.status} ${JSON.stringify(r.body)}`);
}

/** Runs the organization service's re-check of due domains now. */
export async function recheck(): Promise<number> {
  const r = await call(`${ORGANIZATION_URL}/local-dev/recheck`, {
    method: "POST",
  });
  if (r.status !== 200)
    throw new Error(`recheck: ${r.status} ${JSON.stringify(r.body)}`);
  return r.body.checked;
}
