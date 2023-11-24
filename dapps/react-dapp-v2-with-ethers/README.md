# React dApp (with v2 UniversalProvider + Ethers.js)

🔗 Live dapp demo - https://react-dapp-v2-with-ethers.vercel.app <br />
🔗 Live wallet demo - https://react-wallet.walletconnect.com/ <br />
📚 WalletConnect v2 Docs - https://docs.walletconnect.com/2.0

## Overview

This is an example implementation of a React dApp (generated via `create-react-app`) using the v2 [`UniversalProvider`](https://github.com/WalletConnect/walletconnect-monorepo/tree/v2.0/providers/universal-provider) together with [`Ethers.js`](https://docs.ethers.io/v5/) to:

- handle pairings
- manage sessions
- send JSON-RPC requests to a paired wallet

## Running locally

Install the app's dependencies:

```bash
yarn
```

Set up your local environment variables by copying the example into your own `.env.local` file:

```bash
cp .env.local.example .env.local
```

Your `.env.local` now contains the following environment variables:

- `NEXT_PUBLIC_PROJECT_ID` (placeholder) - You can generate your own ProjectId at https://cloud.walletconnect.com
- `NEXT_PUBLIC_RELAY_URL` (already set)

## Develop

```bash
yarn dev
```

## Test

```bash
yarn test
```

## Build

```bash
yarn build
```
