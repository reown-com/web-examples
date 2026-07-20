/**
 * Dapp Picker POC helpers: URL-driven auto-connect mode.
 *
 * The wallet's Explore tab opens this dapp in a webview with:
 *   ?wc_auto=1                    — connect automatically, no connect UI
 *   &aggregator=jupiter|oneinch|kyberswap|uniswap — preset the dropdown
 *   &connect=headless|provider    — which URI-acquisition variant to use
 *
 * The pairing URI is handed to the host wallet via
 * window.ReactNativeWebView.postMessage({type:'wc_session_offer', uri}) with a
 * `wc:` navigation fallback for hosts without the bridge.
 */

export type ConnectVariant = "headless" | "provider";

export interface PickerMode {
  wcAuto: boolean;
  aggregator?: string;
  variant: ConnectVariant;
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
  };
}

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (data: string) => void };
  }
}

/**
 * Hands the pairing URI to the host. Returns the channel used so the UI can
 * surface it. postMessage is primary; `wc:` navigation is the WKWebView
 * fallback (intercepted by the host's onShouldStartLoadWithRequest).
 */
export function offerUriToHost(
  uri: string,
): "postMessage" | "navigation" | "none" {
  const payload = JSON.stringify({ type: "wc_session_offer", uri });
  // Debug/testing hook: lets automation (and curious humans) read the URI.
  (window as unknown as Record<string, unknown>).__wc_last_uri = uri;
  if (window.ReactNativeWebView?.postMessage) {
    window.ReactNativeWebView.postMessage(payload);
    return "postMessage";
  }
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
