// Inline SVG app icons, carried in each side's metadata.
const svg = (body: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${body}</svg>`)}`

export const NIMBUS_ICON = svg(
  `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c5cff"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="url(#g)"/><path d="M20 40c-4 0-7-3-7-7s3-7 7-7c1-6 6-10 12-10 7 0 12 5 12 12 4 0 7 3 7 6s-3 6-7 6z" fill="#fff" opacity=".95"/>`
)

export const EMBER_ICON = svg(
  `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff8a3d"/><stop offset="1" stop-color="#e5376b"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="url(#g)"/><path d="M32 12c4 8 12 12 12 24a12 12 0 0 1-24 0c0-6 3-9 5-12 1 4 3 6 5 6-2-6 0-13 2-18z" fill="#fff" opacity=".95"/>`
)
