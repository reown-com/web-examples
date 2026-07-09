import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Session Fees POC: minimal proxy for the Uniswap Trading API. The API
 * requires an x-api-key header, so the dapp routes quote/swap calls through
 * here and the key stays server-side (UNISWAP_API_KEY, no NEXT_PUBLIC_).
 */

const ALLOWED_PATHS = new Set(["quote", "swap", "check_approval"]);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { path } = req.query;
  const subPath = Array.isArray(path) ? path.join("/") : (path ?? "");

  if (req.method !== "POST" || !ALLOWED_PATHS.has(subPath)) {
    return res.status(400).json({ error: "Unsupported Uniswap API path" });
  }

  const apiKey = process.env.UNISWAP_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error:
        "UNISWAP_API_KEY is not configured. Create a free key at https://developers.uniswap.org/dashboard and set it in .env.local",
    });
  }

  const upstream = await fetch(
    `https://trade-api.gateway.uniswap.org/v1/${subPath}`,
    {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(req.body),
    },
  );
  const body = await upstream.text();
  res
    .status(upstream.status)
    .setHeader("content-type", "application/json")
    .send(body);
}
