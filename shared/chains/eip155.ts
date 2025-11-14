import {
  hashPersonalMessage,
  rpcProvidersByChainId,
  verifySignature,
} from "../helpers";
import { NamespaceMetadata, ChainsMap } from "../types";

export const EIP155Colors = {
  ethereum: "99, 125, 234",
  optimism: "233, 1, 1",
  goerli: "189, 174, 155",
  xdai: "73, 169, 166",
  polygon: "130, 71, 229",
  zksync: "90, 90, 90",
  celo: "60, 203, 132",
  arbitrum: "44, 55, 75",
};

export const EIP155ChainData: ChainsMap = {
  "1": {
    name: "Ethereum Mainnet",
    id: "eip155:1",
    rpc: ["https://api.mycryptoapi.com/eth"],
    slip44: 60,
    testnet: false,
  },
  "5": {
    name: "Ethereum Goerli",
    id: "eip155:5",
    rpc: ["https://rpc.goerli.mudit.blog"],
    slip44: 60,
    testnet: true,
  },
  "11155111": {
    name: "Ethereum Sepolia",
    id: "eip155:11155111",
    rpc: ["https://gateway.tenderly.co/public/sepolia	"],
    slip44: 60,
    testnet: true,
  },
  "10": {
    name: "Optimism Mainnet",
    id: "eip155:10",
    rpc: ["https://mainnet.optimism.io"],
    slip44: 60,
    testnet: false,
  },
  "42": {
    name: "Ethereum Kovan",
    id: "eip155:42",
    rpc: ["https://kovan.poa.network"],
    slip44: 60,
    testnet: true,
  },
  "69": {
    name: "Optimism Kovan",
    id: "eip155:69",
    rpc: ["https://kovan.optimism.io"],
    slip44: 60,
    testnet: true,
  },
  "100": {
    name: "xDAI",
    id: "eip155:100",
    rpc: ["https://dai.poa.network"],
    slip44: 60,
    testnet: false,
  },
  "280": {
    name: "zkSync Era Testnet",
    id: "eip155:280",
    rpc: ["https://testnet.era.zksync.dev"],
    slip44: 60,
    testnet: true,
  },
  "324": {
    name: "zkSync Era",
    id: "eip155:324",
    rpc: ["https://mainnet.era.zksync.io"],
    slip44: 60,
    testnet: false,
  },
  "137": {
    name: "Polygon Mainnet",
    id: "eip155:137",
    rpc: ["https://rpc-mainnet.matic.network"],
    slip44: 60,
    testnet: false,
  },
  "420": {
    name: "Optimism Goerli",
    id: "eip155:420",
    rpc: ["https://goerli.optimism.io"],
    slip44: 60,
    testnet: true,
  },
  "42161": {
    name: "Arbitrum One",
    id: "eip155:42161",
    rpc: ["https://arb1.arbitrum.io/rpc"],
    slip44: 60,
    testnet: false,
  },
  "42220": {
    name: "Celo Mainnet",
    id: "eip155:42220",
    rpc: ["https://forno.celo.org"],
    slip44: 52752,
    testnet: false,
  },
  "44787": {
    name: "Celo Alfajores",
    id: "eip155:44787",
    rpc: ["https://alfajores-forno.celo-testnet.org"],
    slip44: 52752,
    testnet: true,
  },
  "80001": {
    name: "Polygon Mumbai",
    id: "eip155:80001",
    rpc: ["https://rpc-mumbai.matic.today"],
    slip44: 60,
    testnet: true,
  },
  "421611": {
    name: "Arbitrum Rinkeby",
    id: "eip155:421611",
    rpc: ["https://rinkeby.arbitrum.io/rpc"],
    slip44: 60,
    testnet: true,
  },
};

export const EIP155Metadata: NamespaceMetadata = {
  "1": {
    name: "Ethereum",
    logo: "/assets/" + "eip155-1.png",
    rgb: EIP155Colors.ethereum,
  },
  "5": {
    logo: "/assets/" + "eip155-1.png",
    rgb: EIP155Colors.ethereum,
  },
  "11155111": {
    logo: "/assets/" + "eip155-1.png",
    rgb: EIP155Colors.ethereum,
  },
  "10": {
    name: "Optimism",
    logo: "/assets/" + "eip155-10.png",
    rgb: EIP155Colors.optimism,
  },
  "42": {
    logo: "/assets/" + "eip155-42.png",
    rgb: EIP155Colors.ethereum,
  },
  "420": {
    logo: "/assets/" + "eip155-420.png",
    rgb: EIP155Colors.optimism,
  },
  "100": {
    logo: "/assets/" + "eip155-100.png",
    rgb: EIP155Colors.xdai,
  },
  "280": {
    name: "zkSync Era Testnet",
    logo: "/assets/" + "eip155-324.svg",
    rgb: EIP155Colors.zksync,
  },
  "324": {
    name: "zkSync Era",
    logo: "/assets/" + "eip155-324.svg",
    rgb: EIP155Colors.zksync,
  },
  "137": {
    name: "Polygon",
    logo: "/assets/" + "eip155-137.png",
    rgb: EIP155Colors.polygon,
  },
  "80001": {
    logo: "/assets/" + "eip155-80001.png",
    rgb: EIP155Colors.polygon,
  },
  "42161": {
    name: "Arbitrum",
    logo: "/assets/" + "eip155-42161.png",
    rgb: EIP155Colors.arbitrum,
  },
  "42220": {
    name: "Celo",
    logo: "/assets/" + "eip155-42220.png",
    rgb: EIP155Colors.celo,
  },
  "44787": {
    logo: "/assets/" + "eip155-44787.png",
    rgb: EIP155Colors.celo,
  },
  "421611": {
    logo: "/assets/" + "eip155-421611.png",
    rgb: EIP155Colors.arbitrum,
  },
};

export const DEFAULT_EIP155_METHODS = {
  PERSONAL_SIGN: "personal_sign",
  ETH_SEND_TRANSACTION: "eth_sendTransaction",
  ETH_SIGN_TYPED_DATA: "eth_signTypedData",
  WALLET_GRANT_PERMISSIONS: "wallet_grantPermissions",
  WALLET_GET_CAPABILITIES: "wallet_getCapabilities",
  WALLET_SEND_CALLS: "wallet_sendCalls",
  WALLET_GET_CALLS_STATUS: "wallet_getCallsStatus",
  ETH_SIGN_TRANSACTION: "eth_signTransaction",
  ETH_SIGN: "eth_sign",
  ETH_SIGN_TYPED_DATA_V4: "eth_signTypedData_v4",
} as const;

export const DEFAULT_EIP155_EVENTS = {
  ETH_CHAIN_CHANGED: "chainChanged",
  ETH_ACCOUNTS_CHANGED: "accountsChanged",
} as const;

export const EIP155Utils = {
  verifyMessage: async ({
    message,
    signature,
    chainId,
    address,
  }: {
    message: string;
    signature: string;
    chainId: string;
    address: string;
  }) => {
    const rpc = rpcProvidersByChainId[Number(chainId)];

    if (typeof rpc === "undefined") {
      throw new Error(`Missing rpcProvider definition for chainId: ${chainId}`);
    }
    const hashMsg = hashPersonalMessage(message);
    const valid = await verifySignature(
      address,
      signature,
      hashMsg,
      rpc.baseURL
    );
    return valid;
  },
};
