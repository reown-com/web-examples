# Chat Wallet Example (React, Typescript, Ethers, NextJS)

This example aims to demonstrate use cases enabled by the WalletConnect Chat Alpha. Please only use this for reference and development purposes, otherwise you are at risk of losing your funds.

# Useful links

🔗 Chat Wallet Deployment - https://react-wallet-chat.walletconnect.com/ <br />
🔗 Chat Wallet Peer Deployment - https://react-wallet-chat-peer.walletconnect.com/ <br />
📚 WalletConnect docs - https://docs.walletconnect.com/2.0

## Getting started

The example is built atop of [NextJS](https://nextjs.org/) in order to abstract complexity of setting up bundlers, routing etc. So there are few steps you need to follow in order to set everything up

1. Go to [WalletConnect Cloud](https://cloud.walletconnect.com/sign-in) and obtain a project id

2. Install dependencies via `yarn`

3. Setup your environment variables

```bash
cp .env.local.example .env.local
```

Your `.env.local` now contains the following environment variables:

- `NEXT_PUBLIC_PROJECT_ID` (placeholder) - You can generate your own ProjectId at https://cloud.walletconnect.com
- `NEXT_PUBLIC_RELAY_URL` (already set)

5. Run `yarn dev` to start local development


