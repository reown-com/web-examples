export interface AssetData {
  symbol: string;
  name: string;
  contractAddress?: string;
  balance?: string;
}

export interface ChainData {
  name: string;
  id: string;
  rpc: string[];
  slip44: number;
  testnet: boolean;
}
export interface ChainsMap {
  [reference: string]: ChainData;
}
export interface TxData {
  from: string;
  to: string;
  nonce: string;
  gasPrice: string;
  gasLimit: string;
  value: string;
  data: string;
}

export interface BlockScoutTx {
  value: string;
  txreceipt_status: string;
  transactionIndex: string;
  to: string;
  timeStamp: string;
  nonce: string;
  isError: string;
  input: string;
  hash: string;
  gasUsed: string;
  gasPrice: string;
  gas: string;
  from: string;
  cumulativeGasUsed: string;
  contractAddress: string;
  confirmations: string;
  blockNumber: string;
  blockHash: string;
}

export interface BlockScoutTokenTx {
  value: string;
  transactionIndex: string;
  tokenSymbol: string;
  tokenName: string;
  tokenDecimal: string;
  to: string;
  timeStamp: string;
  nonce: string;
  input: string;
  hash: string;
  gasUsed: string;
  gasPrice: string;
  gas: string;
  from: string;
  cumulativeGasUsed: string;
  contractAddress: string;
  confirmations: string;
  blockNumber: string;
  blockHash: string;
}

export interface ParsedTx {
  timestamp: string;
  hash: string;
  from: string;
  to: string;
  nonce: string;
  gasPrice: string;
  gasUsed: string;
  fee: string;
  value: string;
  input: string;
  error: boolean;
  asset: AssetData;
  operations: TxOperation[];
}

export interface TxOperation {
  asset: AssetData;
  value: string;
  from: string;
  to: string;
  functionName: string;
}

export interface GasPricesResponse {
  fastWait: number;
  avgWait: number;
  blockNum: number;
  fast: number;
  fastest: number;
  fastestWait: number;
  safeLow: number;
  safeLowWait: number;
  speed: number;
  block_time: number;
  average: number;
}

export interface GasPrice {
  time: number;
  price: number;
}

export interface GasPrices {
  timestamp: number;
  slow: GasPrice;
  average: GasPrice;
  fast: GasPrice;
}

export interface MethodArgument {
  type: string;
}

export interface Method {
  signature: string;
  name: string;
  args: MethodArgument[];
}

export interface ChainRequestRender {
  label: string;
  value: string;
}

export interface ChainMetadata {
  name?: string;
  logo: string;
  rgb: string;
}

export interface NamespaceMetadata {
  [reference: string]: ChainMetadata;
}
export interface ChainNamespaces {
  [namespace: string]: ChainsMap;
}

export interface AccountAction {
  method: string;
  callback: (chainId: string, address: string) => Promise<void>;
}

export interface AccountBalances {
  [account: string]: AssetData[];
}
