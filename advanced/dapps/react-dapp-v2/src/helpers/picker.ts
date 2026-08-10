/**
 * Dapp Picker POC helpers: URL-driven auto-connect mode.
 *
 * The wallet's Explore tab opens this dapp with:
 *   ?wc_auto=1                    — connect automatically, no connect UI
 *   &aggregator=jupiter|oneinch|kyberswap|uniswap — preset the dropdown
 *   &connect=headless|provider    — which URI-acquisition variant to use
 *   &host_origin=<origin>         — the wallet origin to postMessage back to
 *
 * The pairing URI is handed to the host wallet as
 *   { type: 'wc_session_offer', uri }
 * over whichever host transport is present:
 *   1. React Native bridge   — window.ReactNativeWebView.postMessage (mobile POC)
 *   2. web iframe host       — window.parent.postMessage   (framed)
 *   3. web popup host        — window.opener.postMessage    (window.open'd)
 *   4. wc: navigation        — last-resort fallback (WKWebView scheme intercept)
 * On settle the dapp posts { type: 'wc_session_settled' } back over the same
 * transport so the host can drop its "Connecting…" affordance without polling.
 */

export type ConnectVariant = "headless" | "provider";

export interface PickerMode {
  wcAuto: boolean;
  aggregator?: string;
  variant: ConnectVariant;
  /** The wallet origin to postMessage back to (web hosts). */
  hostOrigin?: string;
}

export function getPickerMode(): PickerMode {
  if (typeof window === "undefined") {
    return { wcAuto: false, variant: "provider" };
  }
  const params = new URLSearchParams(window.location.search);
  const variant =
    params.get("connect") === "headless" ? "headless" : "provider";
  return {
    wcAuto: params.get("wc_auto") === "1",
    aggregator: params.get("aggregator") ?? undefined,
    variant,
    hostOrigin: params.get("host_origin") ?? undefined,
  };
}

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (data: string) => void };
  }
}

export type HostChannel =
  | "postMessage-rn"
  | "postMessage-parent"
  | "postMessage-opener"
  | "navigation"
  | "none";

/**
 * Resolve the web host window to post to and the origin to target.
 * Framed (parent) takes precedence over popup (opener); a framed dapp opened
 * from the wallet has both `parent !== window` and no `opener`.
 *
 * targetOrigin is the `host_origin` param — posted verbatim so the pairing URI
 * (which carries the symmetric key) only reaches the intended wallet. Falling
 * back to "*" when the param is absent is a POC corner cut, noted in the README.
 */
function getWebHostTarget():
  | { win: Window; origin: string; channel: HostChannel }
  | null {
  if (typeof window === "undefined") return null;
  const { hostOrigin } = getPickerMode();
  const origin = hostOrigin || "*";
  if (window.parent && window.parent !== window) {
    return { win: window.parent, origin, channel: "postMessage-parent" };
  }
  if (window.opener) {
    return { win: window.opener as Window, origin, channel: "postMessage-opener" };
  }
  return null;
}

/**
 * Hands the pairing URI to the host. Returns the channel used so the UI can
 * surface it. RN bridge is tried first so the mobile POC is unaffected; the
 * web parent/opener channels are next; `wc:` navigation is the last resort.
 */
export function offerUriToHost(uri: string): HostChannel {
  const payload = JSON.stringify({ type: "wc_session_offer", uri });
  // Debug/testing hook: lets automation (and curious humans) read the URI.
  (window as unknown as Record<string, unknown>).__wc_last_uri = uri;

  // 1. React Native bridge (mobile POC) — unchanged, still first.
  if (window.ReactNativeWebView?.postMessage) {
    window.ReactNativeWebView.postMessage(payload);
    return "postMessage-rn";
  }

  // 2/3. Web host: framed parent or popup opener.
  const target = getWebHostTarget();
  if (target) {
    target.win.postMessage(payload, target.origin);
    return target.channel;
  }

  // 4. `wc:` navigation — WKWebView scheme intercept fallback.
  if (getPickerMode().wcAuto) {
    try {
      window.location.href = uri;
      return "navigation";
    } catch {
      /* host blocked the scheme */
    }
  }
  return "none";
}

/**
 * Tell the host the session has settled so it can drop its "Connecting…"
 * affordance without polling. Same transport precedence as offerUriToHost.
 * The RN host historically inferred settle from the relay; posting is additive
 * and harmless there.
 */
export function notifyHostSettled(): void {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify({ type: "wc_session_settled" });
  if (window.ReactNativeWebView?.postMessage) {
    window.ReactNativeWebView.postMessage(payload);
    return;
  }
  const target = getWebHostTarget();
  target?.win.postMessage(payload, target.origin);
}
