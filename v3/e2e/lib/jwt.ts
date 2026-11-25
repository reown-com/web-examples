// JWTs the tests make themselves: App Signatures (ES256, as an app backend would) and the relay's
// client auth token (EdDSA with a did:key, as every SDK does).
import { createHash, generateKeyPairSync, sign, webcrypto } from "node:crypto";

const b64u = (b: Uint8Array | Buffer | string) =>
  Buffer.from(b).toString("base64url");

/** `sub`: base64url SHA-256 of the request JSON exactly as the SDK sends it. */
export const sha256 = (s: string) =>
  createHash("sha256").update(s, "utf8").digest("base64url");

/** An App Signature: what an app backend returns, signed with `privateJwk`. */
export async function appSignature(
  privateJwk: JsonWebKey & { kid?: string },
  /** `cnx`: the Sign v3 connection the SDK names, which the relay requires there. */
  claims: { iss: string; sub: string; exp?: number; cnx?: string },
) {
  const key = await webcrypto.subtle.importKey(
    "jwk",
    privateJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const header = {
    alg: "ES256",
    typ: "JWT",
    ...(privateJwk.kid ? { kid: privateJwk.kid } : {}),
  };
  const body = { exp: Math.floor(Date.now() / 1000) + 120, ...claims };
  const input = `${b64u(JSON.stringify(header))}.${b64u(JSON.stringify(body))}`;
  const sig = await webcrypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    Buffer.from(input),
  );
  return `${input}.${b64u(new Uint8Array(sig))}`;
}

/** The claims of a JWT, unverified. */
export const claimsOf = (jwt: string) =>
  JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString("utf8"));

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function base58(bytes: Uint8Array) {
  let n = BigInt(`0x${Buffer.from(bytes).toString("hex")}`);
  let out = "";
  while (n > 0n) {
    out = BASE58[Number(n % 58n)] + out;
    n /= 58n;
  }
  for (const b of bytes) {
    if (b !== 0) break;
    out = `1${out}`;
  }
  return out;
}

/** A relay client auth JWT (`aud` the relay URL), for a fresh Ed25519 client key. */
export function relayAuth(aud: string) {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const raw = publicKey.export({ format: "der", type: "spki" }).subarray(-32);
  const iss = `did:key:z${base58(Buffer.concat([Buffer.from([0xed, 0x01]), raw]))}`;
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "EdDSA", typ: "JWT" };
  const claims = {
    iss,
    sub: b64u(webcrypto.getRandomValues(new Uint8Array(32))),
    aud,
    iat: now,
    exp: now + 3600,
  };
  const input = `${b64u(JSON.stringify(header))}.${b64u(JSON.stringify(claims))}`;
  return {
    jwt: `${input}.${b64u(sign(null, Buffer.from(input), privateKey))}`,
    clientId: iss,
  };
}

/** A fresh P-256 key pair as JWKs, e.g. an attacker's. */
export async function newKey(kid: string) {
  const pair = await webcrypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  const privateJwk = {
    ...(await webcrypto.subtle.exportKey("jwk", pair.privateKey)),
    kid,
  };
  const { kty, crv, x, y } = privateJwk;
  return { kid, privateJwk, publicJwk: { kty, crv, x, y, kid } };
}
