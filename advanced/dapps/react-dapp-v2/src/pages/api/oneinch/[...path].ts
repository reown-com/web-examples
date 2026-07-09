import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Session Fees POC: minimal proxy for the 1inch API. api.1inch.dev requires
 * an Authorization header and blocks browser CORS, so the dapp routes its
 * quote/swap calls through here and the API key stays server-side
 * (ONEINCH_API_KEY, no NEXT_PUBLIC_ prefix).
 */

const ALLOWED_PATH = /^swap\/v6\.\d+\/\d+\/(quote|swap)$/;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { path, ...query } = req.query;
  const subPath = Array.isArray(path) ? path.join("/") : (path ?? "");

  if (req.method !== "GET" || !ALLOWED_PATH.test(subPath)) {
    return res.status(400).json({ error: "Unsupported 1inch API path" });
  }

  const apiKey = process.env.ONEINCH_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error:
        "ONEINCH_API_KEY is not configured. Create a free key at https://portal.1inch.dev and set it in .env.local",
    });
  }

  const search = new URLSearchParams(
    Object.entries(query).map(([key, value]) => [key, String(value)]),
  );
  const upstream = await fetch(`https://api.1inch.dev/${subPath}?${search}`, {
    headers: { Authorization: `Bearer ${apiKey}`, accept: "application/json" },
  });
  const body = await upstream.text();
  res
    .status(upstream.status)
    .setHeader("content-type", "application/json")
    .send(body);
}
