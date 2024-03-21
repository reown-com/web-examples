# Auth Wallet Example (React, Typescript, Ethers, NextJS)

This example aims to demonstrate wallet-facing use cases enabled by WalletConnect Auth Alpha. Please only use this for reference and development purposes, otherwise you are at risk of losing your funds.

# Useful links

🔗 Live wallet app - https://react-auth-wallet.walletconnect.com/ <br />
🔗 Live dapp - https://react-auth-dapp.walletconnect.com/ <br />
📚 WalletConnect docs - https://docs.walletconnect.com/2.0

## Getting started

Example is built atop of [NextJS](https://nextjs.org/) in order to abstract complexity of setting up bundlers, routing etc. So there are few steps you need to follow in order to set everything up

1. Go to [WalletConnect Cloud](https://cloud.walletconnect.com/sign-in) and obtain a project id

2. Add your project details in [WalletConnectUtil.ts](https://github.com/WalletConnect/web-examples/blob/main/wallets/react-wallet-v2/src/utils/WalletConnectUtil.ts) file

3. Install dependencies via `npm install`

4. Setup your environment variables

```bash
cp .env.local.example .env.local
```

Your `.env.local` now contains the following environment variables:

- `NEXT_PUBLIC_PROJECT_ID` (placeholder) - You can generate your own ProjectId at https://cloud.walletconnect.com
- `NEXT_PUBLIC_RELAY_URL` (already set)

5. Run `npm run dev` to start local development


