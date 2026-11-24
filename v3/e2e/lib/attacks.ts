// What the exploit tests use to attack: a stand-in for Nimbus's signing backend, the real backends
// called the way an attacker's script would, and raw relay calls.
import { request as httpRequest } from "node:http";
import type { Page, Route } from "@playwright/test";

import { relayAuth } from "./jwt";
import { NIMBUS_PORT, PROJECT_ID, RELAY_URL } from "./stack";

/**
 * Calls Nimbus's signing backend as served on `host` (`/api/wc-attestation`, or the insecure demo
 * one), from a script: no browser, so any Host and no Origin rules.
 */
export function callBackend(
  host: string,
  requestJson: string,
  path = "/api/wc-attestation",
): Promise<{ status: number; appSignature?: string; error?: string }> {
  const body = JSON.stringify({ requestJson });
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      {
        host: "127.0.0.1",
        port: NIMBUS_PORT,
        path,
        method: "POST",
        headers: {
          host: `${host}:${NIMBUS_PORT}`,
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let text = "";
        res.on("data", (c) => (text += c));
        res.on("end", () => {
          let json: any = {};
          try {
            json = JSON.parse(text);
          } catch {}
          resolve({ status: res.statusCode ?? 0, ...json });
        });
      },
    );
    req.on("error", reject);
    req.end(body);
  });
}

/**
 * Replaces Nimbus's signing backend in this page: every App Signature the SDK asks for comes from
 * `sign` instead (what a compromised or attacker-controlled frontend can do). `sign` returns the
 * JWT, or undefined to let the real backend answer.
 */
export async function replaceSigner(
  page: Page,
  sign: (requestJson: string, route: Route) => Promise<string | undefined>,
) {
  await page.route("**/api/wc-attestation", async (route) => {
    const { requestJson } = JSON.parse(route.request().postData() ?? "{}");
    const jwt = await sign(requestJson, route);
    if (jwt === undefined) return route.continue();
    await route.fulfill({ json: { appSignature: jwt } });
  });
}

/** The RPC method inside a request the SDK asks to have signed. */
export const methodOf = (requestJson: string) => {
  const rpc = JSON.parse(requestJson);
  return rpc.method === "wc_sessionRequest"
    ? rpc.params?.request?.method
    : rpc.method;
};

/**
 * A raw Sign v2 publish over a browser WebSocket from `page` (so with the page's Origin), as an
 * old SDK would send it: `irn_publish` with `tag` and an optional `appSignature`. Resolves with
 * the relay's JSON-RPC answer.
 */
export async function wsPublishFromPage(
  page: Page,
  params: {
    topic: string;
    message: string;
    tag: number;
    plaintext?: string;
    appSignature?: string;
  },
): Promise<{
  result?: unknown;
  error?: { code: number; message: string; data?: string };
}> {
  const wsUrl = RELAY_URL.replace(/^http/, "ws");
  const { jwt } = relayAuth(wsUrl);
  const url = `${wsUrl}/?auth=${jwt}&projectId=${PROJECT_ID}&ua=wc-2/e2e/browser`;
  return page.evaluate(
    ({ url, params }) =>
      new Promise((resolve, reject) => {
        const ws = new WebSocket(url);
        const id = Date.now();
        ws.onerror = () => reject(new Error("websocket error"));
        ws.onopen = () =>
          ws.send(
            JSON.stringify({
              id,
              jsonrpc: "2.0",
              method: "irn_publish",
              params: { ttl: 300, prompt: true, ...params },
            }),
          );
        ws.onmessage = (e) => {
          const msg = JSON.parse(String(e.data));
          if (msg.id !== id) return;
          ws.close();
          resolve(msg);
        };
      }),
    { url, params },
  ) as any;
}

/**
 * A raw Sign v2 proposal over HTTP (`POST /sessionProposals`) from `page`, with its Origin.
 * Resolves with the status and the relay's error code.
 */
export async function httpProposeFromPage(
  page: Page,
  body: {
    pairingTopic: string;
    sessionProposal: string;
    sessionProposalPlaintext: string;
    appSignature?: string;
  },
): Promise<{ status: number; error?: string }> {
  const { jwt } = relayAuth(RELAY_URL);
  return page.evaluate(
    async ({ url, jwt, body }) => {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          authorization: `Bearer ${jwt}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      return { status: res.status, error: json.error ?? json.code };
    },
    { url: `${RELAY_URL}/sessionProposals?projectId=${PROJECT_ID}`, jwt, body },
  );
}

export const randomTopic = () =>
  Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("hex");

/** A Sign v2 proposal's plaintext and a stand-in envelope (the relay never decrypts it). */
export function v2Proposal(url: string) {
  const plaintext = JSON.stringify({
    id: Date.now(),
    jsonrpc: "2.0",
    method: "wc_sessionPropose",
    params: {
      requiredNamespaces: {},
      optionalNamespaces: {
        eip155: {
          chains: ["eip155:1"],
          methods: ["personal_sign"],
          events: [],
        },
      },
      relays: [{ protocol: "irn" }],
      proposer: {
        publicKey: "ab".repeat(32),
        metadata: { name: "Claims to be", description: "", url, icons: [] },
      },
      expiryTimestamp: Math.floor(Date.now() / 1000) + 300,
    },
  });
  const envelope = Buffer.concat([
    Buffer.from([0]),
    crypto.getRandomValues(new Uint8Array(60)),
  ]).toString("base64");
  return { plaintext, envelope };
}
