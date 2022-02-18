# WalletConnect React Wallet Example

⚠️ Wallet should only be used as a refference example & for development purposes <br />
🔗 Live app - https://react-wallet-v2.vercel.app <br />
📚 WalletConnect docs - https://docs.walletconnect.com/2.0

Example wallet implementation using [WalletConnect](https://walletconnect.com/), [Ethers](https://docs.ethers.io/v5/), [React](https://reactjs.org/) and [TypeScript](https://www.typescriptlang.org)

## Getting started

This example is built atop of [NextJS](https://nextjs.org/) in order to abstract complexity of setting up bundlers, routing etc.. So there are only few steps you need to follow in order to set everything up

1. Go to [WalletConnect Cloud](https://cloud.walletconnect.com/sign-in) and obtain a project id
2. Add your project details in [WalletConnectUtil.ts](https://github.com/WalletConnect/web-examples/blob/main/wallets/react-wallet-v2/src/utils/WalletConnectUtil.ts) file.
3. [Optional] To use project id as environment variable follow [NextJS environment docs](https://nextjs.org/docs/basic-features/environment-variables)
4. Install dependencies `yarn install` or `npm install`
5. Run `yarn dev` or `npm run dev` to start local development

## Navigating through this example

1. Initial setup and initializations happen in [_app.ts](https://github.com/WalletConnect/web-examples/blob/main/wallets/react-wallet-v2/src/pages/_app.tsx) file.
2. WalletConnect client and ethers wallets are initialized in [useInitialization.ts ](https://github.com/WalletConnect/web-examples/blob/main/wallets/react-wallet-v2/src/hooks/useInitialization.ts) hook
3. Subscription and handling of WalletConnect events happens in [useWalletConnectEventsManager.ts](https://github.com/WalletConnect/web-examples/blob/main/wallets/react-wallet-v2/src/hooks/useWalletConnectEventsManager.ts) hook, that oppens related [Modal views](https://github.com/WalletConnect/web-examples/tree/main/wallets/react-wallet-v2/src/views) and passes them all necesary data.
4. [Modal views](https://github.com/WalletConnect/web-examples/tree/main/wallets/react-wallet-v2/src/views) are responsible for data display and handling approval or rejection actions.
5. Uppon approval or rejection modals pass request data to [RequestHandlerUtil.ts](https://github.com/WalletConnect/web-examples/blob/main/wallets/react-wallet-v2/src/utils/RequestHandlerUtil.ts) that performs all necesary ethers work based on request method and returns formated json rpc result data that can be then used for WallteConnect client responses.
