const projectId = process.env["NEXT_PUBLIC_PROJECT_ID"];
if (!projectId) {
  throw new Error("NEXT_PUBLIC_PROJECT_ID is not set");
}
export const WALLET_URL =
  process.env["WALLET_URL"] || "https://react-wallet.walletconnect.com/";
export const WC_COSIGNER_BASE_URL = "https://rpc.walletconnect.com/v1/sessions";
export const USEROP_BUILDER_SERVICE_BASE_URL =
  "https://react-wallet.walletconnect.com/api";
export function getPublicUrl() {
  const vercelUrl = process.env["NEXT_PUBLIC_VERCEL_URL"];
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  return "https://lab.web3modal.com";
}

export const CUSTOM_WALLET = "wc:custom_wallet";

// eslint-disable-next-line init-declarations
let storedCustomWallet;
if (typeof window !== "undefined") {
  storedCustomWallet = localStorage.getItem(CUSTOM_WALLET);
}

const customWallet = storedCustomWallet ? [JSON.parse(storedCustomWallet)] : [];

export const ConstantsUtil = {
  SigningSucceededToastTitle: "Signing Succeeded",
  SigningFailedToastTitle: "Signing Failed",
  TestIdSiweAuthenticationStatus: "w3m-authentication-status",
  Metadata: {
    name: "AppKit Lab",
    description: "Laboratory environment for AppKit testing",
    url: getPublicUrl(),
    icons: [`${getPublicUrl()}/metadata-icon.svg`],
    verifyUrl: "",
  },
  CustomWallets: [
    ...customWallet,
    {
      id: "react-wallet-v2",
      name: "React Sample Wallet",
      homepage: WALLET_URL,
      mobile_link: WALLET_URL,
      desktop_link: WALLET_URL,
      webapp_link: WALLET_URL,
      image_url: "/sample-wallets/react.svg",
    },
    {
      id: "kotlin-web3wallet",
      name: "Kotlin Sample Wallet",
      homepage: "https://walletconnect.com",
      mobile_link: "kotlin-web3wallet://",
      image_url: "/sample-wallets/kotlin.svg",
    },
    {
      id: "swift-web3wallet",
      name: "Swift Sample Wallet",
      homepage: "https://walletconnect.com",
      mobile_link: "walletapp://",
      image_url: "/sample-wallets/swift.svg",
    },
    {
      id: "flutter-web3wallet",
      name: "Flutter Sample Wallet",
      homepage: "https://walletconnect.com",
      mobile_link: "wcflutterwallet://",
      image_url: "/sample-wallets/flutter.svg",
    },
    {
      id: "rn-web3wallet",
      name: "React Native Sample Wallet",
      homepage: "https://walletconnect.com",
      mobile_link: "rn-web3wallet://",
      image_url: "/sample-wallets/react-native.svg",
    },
  ],
  ProjectId: projectId,
};

export function getBundlerUrl(): string {
  const localBundlerUrl = process.env["NEXT_PUBLIC_LOCAL_BUNDLER_URL"];
  if (localBundlerUrl) {
    return localBundlerUrl;
  }
  const apiKey = process.env["NEXT_PUBLIC_PIMLICO_KEY"];
  if (!apiKey) {
    throw new Error("env NEXT_PUBLIC_PIMLICO_KEY missing.");
  }

  return `https://api.pimlico.io/v2/sepolia/rpc?apikey=${apiKey}`;
}
