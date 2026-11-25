// The local Verify v4 stack (rs-relay's scripts/verify-v4-local) these tests run against: where it
// is, its keys, and the organization service's API and local development controls.
import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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
  /** Requires signed connection requests too (requireSignedConnections). */
  strict: "strict.new.localhost",
} as const;
export const VERIFIED_NAME = "Verify v4 E2E";

/** A fresh domain under `*.new.localhost`, which Nimbus can sign for (NEXT_PUBLIC_APP_SIGNATURE_DOMAINS). */
export const freshDomain = (label: string) =>
  `${label}-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}.new.localhost`;

const wellKnown = (domain: string) =>
  join(STATE, "well-known", `${domain}.json`);
/** `*.localhost` has no DNS: the stack's domain server answers its TXT records from here. */
const txtRecords = (domain: string) => join(STATE, "txt", `${domain}.txt`);

/** The TXT record at `_wc_domain_verify.<domain>` that vouches for a document's exact bytes. */
export const txtValue = (document: string | Buffer) =>
  `sha256=${createHash("sha256").update(document).digest("base64url")}`;

/**
 * Publishes `domain`'s /.well-known/wc-domain-verify.json, naming the stack's organization (or
 * the given domain verification IDs instead), and its `_wc_domain_verify` TXT record with the
 * document's hash: the service needs both. `txt: false` leaves the TXT record as it was (a change
 * of the web host alone, which no longer matches it).
 */
export function publishDocument(
  domain: string,
  publicJwks: JsonWebKey[],
  {
    organizations = [DOMAIN_VERIFICATION_ID],
    txt = true,
  }: { organizations?: string[]; txt?: boolean } = {},
) {
  const doc = {
    allowed_organizations: organizations,
    allowed_projects: [PROJECT_ID],
    keys: publicJwks,
  };
  const body = JSON.stringify(doc, null, 2);
  writeFileSync(wellKnown(domain), body);
  if (txt) {
    mkdirSync(dirname(txtRecords(domain)), { recursive: true });
    writeFileSync(txtRecords(domain), `${txtValue(body)}\n`);
  }
  return doc;
}

/** Removes the document and its TXT record. */
export function unpublishDocument(domain: string) {
  rmSync(wellKnown(domain), { force: true });
  rmSync(txtRecords(domain), { force: true });
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
        // The AWS SDK loads native root certificates even for Floci's plain HTTP; without a
        // readable store it panics.
        SSL_CERT_FILE: process.env.SSL_CERT_FILE ?? "/etc/ssl/cert.pem",
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

/** WalletConnect's scam data for a domain: either flag refuses its first Refresh (422 domain_flagged). */
export interface DomainFacts {
  isScam?: boolean;
  isSimilarTo?: string;
}

/** Stands in for WalletConnect's scam data: sets a domain's flags (`{}` clears them). */
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

/** The reviewed business of the stack's organization ("by …"). */
export const VERIFIED_BUSINESS = "Verify v4 Local Inc.";
export const VERIFIED_ICON = "https://walletconnect.com/favicon.ico";

/**
 * Stands in for WalletConnect's review of the stack's organization (its business). Business
 * verified needs it `verified` and the project's review (`setProjectReview`). It covers every
 * domain the organization's keys sign for, so tests that expect the domain only turn it off.
 * Waits out the validate cache the relay keeps (up to ~10 s), so the next request sees it. Off by
 * default (global setup); a test that turns it on turns it off again in `afterEach`.
 */
let businessVerified = false;
export async function setBusinessVerified(
  verified: boolean,
  { force = false }: { force?: boolean } = {},
) {
  // Global setup turns it off; each worker remembers what it set since.
  if (!force && verified === businessVerified) return;
  businessVerified = verified;
  const r = await call(
    `${ORGANIZATION_URL}/local-dev/organizations/${ORGANIZATION_ID}/review`,
    {
      method: "PUT",
      body: JSON.stringify({ businessName: VERIFIED_BUSINESS, verified }),
    },
  );
  if (r.status !== 200)
    throw new Error(
      `set organization review: ${r.status} ${JSON.stringify(r.body)}`,
    );
  await new Promise((resolve) => setTimeout(resolve, 11_000));
}

/** Stands in for WalletConnect's review of the stack's project (its app): the name and icon shown. */
export async function setProjectReview(name: string, icon?: string) {
  const r = await call(
    `${ORGANIZATION_URL}/local-dev/projects/${PROJECT_ID}/review`,
    { method: "PUT", body: JSON.stringify({ name, icon }) },
  );
  if (r.status !== 200)
    throw new Error(
      `set project review: ${r.status} ${JSON.stringify(r.body)}`,
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
