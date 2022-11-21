# Vue Auth dApp

### Stack
- 💚 Vue 3
- ⛰️ Nuxt 3
- 🍍 Pinia
- 🟦 TypeScript
- 💨 TailwindCSS
- 🔗 ethers.js


## Overview

This example aims to demonstrate dapp-facing use cases enabled by WalletConnect Auth Client.

...And show that you can easily use WalletConnect with any framework.

## Running locally

Install the app's dependencies:

```bash
yarn
```

Set up your local environment variables by copying the example into your own `.env` file:

```bash
cp .env.example .env
```

Your `.env` now contains the following environment variables:

- `WALLETCONNECT_PROJECT_ID` (placeholder) - You can generate your own ProjectId at https://cloud.walletconnect.com

Also, the default relay server `WALLETCONNECT_RELAY_URL` is set. You can change it to use your own instance.


## Development Server

Start the development server on http://localhost:3000

```bash
yarn dev
```

## Production

Build the application for production:

```bash
yarn build
```

Locally preview production build:

```bash
yarn preview
```

Checkout the [deployment documentation](https://v3.nuxtjs.org/guide/deploy/presets) for more information.
