# Ethereum Provider Example

This example demonstrates how to use WalletConnect's Ethereum Provider with various Ethereum JSON-RPC methods.

## Features

- **Wallet Connection**: Connect to wallets using WalletConnect v2
- **Account Management**: View connected accounts and balances
- **Transaction Signing**: Sign transactions using `eth_signTransaction`
- **Raw Transaction Sending**: Send signed transactions using `eth_sendRawTransaction`
- **Typed Data Signing**: Sign EIP-712 typed data
- **Transaction History**: View recent transaction details

## RPC Methods Implemented

### eth_signTransaction

The `eth_signTransaction` method signs a transaction that can be submitted to the network at a later time using `eth_sendRawTransaction`.

**Parameters:**

- `Object` - The transaction object containing:
  - `from`: `DATA`, 20 Bytes - The address the transaction is sent from
  - `to`: `DATA`, 20 Bytes - (optional) The address the transaction is directed to
  - `data`: `DATA` - (optional) The compiled code of a contract OR the hash of the invoked method signature and encoded parameters
  - `gas`: `QUANTITY` - (optional, default: 90000) Integer of the gas provided for the transaction execution
  - `gasPrice`: `QUANTITY` - (optional) Integer of the gasPrice used for each paid gas
  - `value`: `QUANTITY` - (optional) Integer of the value sent with this transaction
  - `nonce`: `QUANTITY` - (optional) Integer of a nonce
  - `chainId`: `QUANTITY` - (optional) Integer of the chain ID

**Returns:**

- `DATA` - the signed transaction data

**Example Usage:**

```typescript
const transaction = {
  from: "0x...",
  to: "0x...",
  value: "0x0",
  gas: "0x5208",
  gasPrice: "0x...",
  nonce: "0x...",
  chainId: "0x1",
};

const signedTransaction = await provider.request({
  method: "eth_signTransaction",
  params: [transaction],
});
```

### eth_sendRawTransaction

The `eth_sendRawTransaction` method creates a new message call transaction or contract creation for signed transactions.

**Parameters:**

- `DATA` - the signed transaction data

**Returns:**

- `DATA`, 32 Bytes - the transaction hash

**Example Usage:**

```typescript
const txResponse = await provider.request({
  method: "eth_sendRawTransaction",
  params: [signedTransaction],
});
```

## Workflow

1. **Connect Wallet**: Click "Connect with ethereum-provider" to establish a WalletConnect session
2. **Sign Transaction**: Use the "Sign Transaction" component to create and sign a transaction
3. **Send Raw Transaction**: Copy the signed transaction from step 2 and paste it into the "Send Raw Transaction" component
4. **View Results**: Check the transaction hash and view it on Etherscan

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set your WalletConnect Project ID in `.env`:

   ```
   VITE_PROJECT_ID=your_project_id_here
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

## Dependencies

- `@walletconnect/ethereum-provider`: WalletConnect v2 Ethereum Provider
- `ethers`: Ethereum library for interacting with the blockchain
- `react`: React framework
- `vite`: Build tool and dev server

## Architecture

The app is structured with separate components for each RPC method:

- `SignTransactionComponent`: Handles `eth_signTransaction`
- `SendRawTransactionComponent`: Handles `eth_sendRawTransaction`
- `SignTypedDataComponent`: Handles EIP-712 signing
- `BalanceComponent`: Shows account balances
- `AccountsComponent`: Displays connected accounts

Each component follows the same pattern:

1. Accept provider and ethersWeb3Provider as props
2. Implement the specific RPC method
3. Handle loading states and errors
4. Display results in a user-friendly format

## Security Notes

- Always verify transaction details before signing
- The `eth_signTransaction` method requires the account to be unlocked
- Signed transactions can be reused until they are submitted to the network
- Use appropriate gas limits and gas prices for your transactions
