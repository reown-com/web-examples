import { Core } from "@walletconnect/core";
import { WalletKit, IWalletKit, isPaymentLink } from "@reown/walletkit";
import { PROJECT_ID, RELAY_URL, WALLET_METADATA } from "@/config/chains";

export { isPaymentLink };
export let walletkit: IWalletKit;

export async function createWalletKit() {
  if (!PROJECT_ID) {
    throw new Error(
      "NEXT_PUBLIC_PROJECT_ID is not set. Create a .env.local file with your WalletConnect project id " +
        "(get one at https://dashboard.walletconnect.com).",
    );
  }

  const core = new Core({
    projectId: PROJECT_ID,
    relayUrl: RELAY_URL,
    logger: "error",
  });

  // Pay authenticates with the project id (appId) and calls
  // api.pay.walletconnect.com directly (the SDK's default baseUrl).
  walletkit = await WalletKit.init({
    core,
    metadata: WALLET_METADATA,
    signConfig: { disableRequestQueue: true },
    payConfig: {
      appId: PROJECT_ID,
    },
  });

  return walletkit;
}
