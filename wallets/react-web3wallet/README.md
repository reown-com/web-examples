# Web3Wallet Example (React, Typescript, Ethers, NextJS, Cosmos)

This example aims to demonstrate basic and advanced use cases enabled by WalletConnect's Web3Wallet SDK.

**This Web3Wallet example implementation** is to serve as a reference for wallet developers.

Please only use this for reference and development purposes, otherwise you are at risk of losing your funds.

# Useful links

🔗 Live Web3Wallet app - https://react-web3wallet.vercel.app <br />
🔗 Live dapp - `Sign` - https://react-app.walletconnect.com <br />
🔗 Live dapp - `Auth` - https://react-auth-dapp.walletconnect.com/ <br />
📚 WalletConnect docs - https://docs.walletconnect.com/2.0

## Getting started

Example is built atop of [NextJS](https://nextjs.org/) in order to abstract complexity of setting up bundlers, routing etc. So there are few steps you need to follow in order to set everything up

1. Go to [WalletConnect Cloud](https://cloud.walletconnect.com/sign-in) and obtain a project id

2. Add your project details in [WalletConnectUtil.ts](https://github.com/WalletConnect/web-examples/blob/main/wallets/react-wallet-v2/src/utils/WalletConnectUtil.ts) file

3. Install dependencies `yarn install` or `npm install`

4. Setup your environment variables

```bash
cp .env.local.example .env.local
```

Your `.env.local` now contains the following environment variables:

- `NEXT_PUBLIC_PROJECT_ID` (placeholder) - You can generate your own ProjectId at https://cloud.walletconnect.com
- `NEXT_PUBLIC_RELAY_URL` (already set)

5. Run `yarn dev` or `npm run dev` to start local development

## Navigating through example

1. Initial setup and initializations happen in [_app.ts](https://github.com/WalletConnect/web-examples/blob/main/wallets/react-wallet-v2/src/pages/_app.tsx) file
2. Web3Wallet client, ethers and cosmos wallets are initialized in [useInitialization.ts ](https://github.com/WalletConnect/web-examples/blob/main/wallets/react-wallet-v2/src/hooks/useInitialization.ts) hook
3. Subscription and handling of WalletConnect events happens in [useWalletConnectEventsManager.ts](https://github.com/WalletConnect/web-examples/blob/main/wallets/react-wallet-v2/src/hooks/useWalletConnectEventsManager.ts) hook, that opens related [Modal views](https://github.com/WalletConnect/web-examples/tree/main/wallets/react-wallet-v2/src/views) and passes them all necessary data
4. [Modal views](https://github.com/WalletConnect/web-examples/tree/main/wallets/react-wallet-v2/src/views) are responsible for data display and handling approval or rejection actions
5. Upon approval or rejection, modals pass the request data to [RequestHandlerUtil.ts](https://github.com/WalletConnect/web-examples/blob/main/wallets/react-wallet-v2/src/utils/RequestHandlerUtil.ts) that performs all necessary work based on the request method and returns formated json rpc result data that can be then used for WalletConnect client responses

## Migrate from `sign-client` to `Web3Wallet`

1. Initialization
```javascript
    // metadata of your app
    const metadata = {
        name: "Demo app",
        description: "Demo Client as Wallet/Peer",
        url: "www.walletconnect.com",
        icons: [],
    };
    
    /* old */
    import { SignClient } from "@walletconnect/sign-client";

    const signClient = await SignClient.init({
        projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
        metadata,
    })

    /* new */
    import { Core } from "@walletconnect/core";
    import { Web3Wallet } from "@walletconnect/web3wallet";

    const core = new Core({
        projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
    })

    const web3wallet = await Web3Wallet.init({
        core, // <- pass the shared `core` instance
        metadata: `${metaData}`
    })
```
2. Pair with a dapp

```javascript
    /* old */
    signClient.on("session_proposal", async (proposal) => {
        const { acknowledged } = await B.approve({
            id: proposal.id,
            namespaces,
        });
        const session = await acknowledged();
    });
    await signClient.pair({ uri });

    /* new */
    web3wallet.on("session_proposal", async (proposal) => {
        const session = await wallet.approveSession({
            id: proposal.id,
            namespaces,
        });
    });
    await core.pairing.pair({ uri })
```
3. Responding to session requests

```javascript
    /* old */
    signClient.on("session_request", (event) => {
        // process the request 
        const params = ...
        // respond
        await signClient.respond({ params })
    });

    /* new */
    web3wallet.on("session_request", (event) => {
        // process the request 
        const params = ...
        // respond
        await web3wallet.respondSessionRequest({ params })
    });
```
4. Emit session events

```javascript
    // emit events such as "chainChanged", "accountsChanged", etc.

    /* old */
    await signClient.emit({ params })

    /* new */
    await web3wallet.emitSessionEvent({ params })
```

5. Extend a session

```javascript
    /* old */
    await signClient.extend({ topic });

    /* new */
    await wallet.extendSession({ topic });
```

6. Disconnect from a session

```javascript
    /* old */
    await signClient.disconnect({
        topic,
        reason: getSdkError("USER_DISCONNECTED"),
    });

    /* new */
    await web3wallet.disconnectSession({
        topic,
        reason: getSdkError("USER_DISCONNECTED"),
    });
```

7. Events

```javascript
    /* old */
    signClient.on("session_proposal", handler)
    signClient.on("session_request", handler)

    /* new */
    web3wallet.on("session_proposal", handler)
    web3wallet.on("session_request", handler)
```

## Migrate from `auth-client` to `Web3Wallet`

1. Initialization

```javascript

    // metadata of your app
    const metadata = {
        name: "Demo app",
        description: "Demo Client as Wallet/Peer",
        url: "www.walletconnect.com",
        icons: [],
    };

    /* old */
    import { AuthClient } from "@walletconnect/auth-client";

    const authClient = await AuthClient.init({
        projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
        metadata,
    })

    /* new */
    import { Core } from "@walletconnect/core";
    import { Web3Wallet } from "@walletconnect/web3wallet";

    const core = new Core({
        projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
    })

    const web3wallet = await Web3Wallet.init({
        core, // <- pass the shared `core` instance
        metadata: `${metaData}`
    })
```
2. Authenticate with a dapp

```javascript
    /* old */
    const iss = `did:pkh:eip155:1:${address}`;
    authClient.on("auth_request", async (event) => {
        // format the payload
        const message = authClient.formatMessage(event.params.cacaoPayload, iss);
        // prompt the user to sign the message
        const signature = await wallet.signMessage(message);
        // respond
        await authClient.respond(
            {
                id: args.id,
                signature: {
                    s: signature,
                    t: "eip191",
                },
            },
            iss,
        );
    });

    await authClient.core.pairing.pair({ uri, activatePairing: true });

    /* new */
    const iss = `did:pkh:eip155:1:${address}`;
    web3wallet.on("auth_request", async (event) => {
        // format the payload
        const message = authClient.formatMessage(event.params.cacaoPayload, iss);
        // prompt the user to sign the message
        const signature = await wallet.signMessage(message);
        // respond
        await web3wallet.respondAuthRequest(
            {
                id: args.id,
                signature: {
                    s: signature,
                    t: "eip191",
                },
            },
            iss,
        );
    })

    await core.pairing.pair({ uri: request.uri, activatePairing: true })
```

3. Events

```javascript
    /* old */
    authClient.on("auth_request", handler)
    /* new */
    web3wallet.on("auth_request", handler)
```
