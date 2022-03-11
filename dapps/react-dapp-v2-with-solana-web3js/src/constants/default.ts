export const DEFAULT_MAIN_CHAINS = [
  // mainnets
  "solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ",
];

export const DEFAULT_TEST_CHAINS = [
  // testnets
  "solana:8E9rvCKLFQia2Y35HXjjpWzj8weVo44K",
];

export const DEFAULT_CHAINS = [...DEFAULT_MAIN_CHAINS, ...DEFAULT_TEST_CHAINS];

export const DEFAULT_PROJECT_ID = process.env.REACT_APP_PROJECT_ID;

export const DEFAULT_INFURA_ID = process.env.REACT_APP_INFURA_ID;

export const DEFAULT_RELAY_URL = process.env.REACT_APP_RELAY_URL;

export const DEFAULT_EIP155_METHODS = ["eth_sendTransaction", "personal_sign", "eth_signTypedData"];

export const DEFAULT_LOGGER = "debug";

export const DEFAULT_APP_METADATA = {
  name: "React App",
  description: "React App for WalletConnect",
  url: "https://walletconnect.com/",
  icons: ["https://avatars.githubusercontent.com/u/37784886"],
};
