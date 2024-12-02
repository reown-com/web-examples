import { AppKitNetwork } from '@reown/appkit/networks'
import {
    type SIWESession,
    type SIWEVerifyMessageArgs,
    type SIWECreateMessageArgs,
    createSIWEConfig,
    formatMessage,
  } from '@reown/appkit-siwe'
import { getAddress } from 'viem';

const BASE_URL = 'http://localhost:8080';
let session: SIWESession | null = null;

// Normalize the address (checksum)
const normalizeAddress = (address: string): string => {
  try {
    const splitAddress = address.split(':');
    const extractedAddress = splitAddress[splitAddress.length - 1];
    const checksumAddress = getAddress(extractedAddress);
    splitAddress[splitAddress.length - 1] = checksumAddress;
    const normalizedAddress = splitAddress.join(':');

    return normalizedAddress;
  } catch {
    return address;
  }
}

// call the server to get a nonce
 const getNonce = async () : Promise<string> => {
    const res = await fetch(BASE_URL + "/nonce", {
        method: "GET",
        credentials: 'include',
      });
    if (!res.ok) {
        throw new Error('Network response was not ok');
    }
    const nonce = await res.text();
    console.log('Nonce:', nonce);
    return nonce;
}

// call the server to verify the message
 const verifyMessage = async ({ message, signature }: SIWEVerifyMessageArgs): Promise<{ address: string, chainId: number }> => {
    const response = await fetch(BASE_URL + "/verify", {
        method: "POST",
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({ message, signature }),
        credentials: 'include'
    });

    if (!response.ok) {
        throw new Error('Network response was not ok');
    }

    const data = await response.json();
    return data as { address: string, chainId: number };
}

export const createSIWE = (chains: [AppKitNetwork, ...AppKitNetwork[]]) => {
    return createSIWEConfig({
      signOutOnAccountChange: true,
      signOutOnNetworkChange: true,
        getMessageParams: async () => ({
              domain: window.location.host,
              uri: window.location.origin,
              chains: chains.map((chain: AppKitNetwork) => parseInt(chain.id.toString())),
              statement: 'Welcome to the dApp!\nPlease sign this message',
            }),
        createMessage: ({ address, ...args }: SIWECreateMessageArgs) => {
          // normalize the address in case you are not using our library in the backend
          return formatMessage(args, normalizeAddress(address))
        },
        getNonce,
        getSession: async () => session,
        verifyMessage: async ({ message, signature }: SIWEVerifyMessageArgs) => {
          const response = await verifyMessage({ message, signature }).catch(() => undefined);
          if (response) {
            session = { address: response.address, chainId: response.chainId };
            return true
          }
          return false
        },
        signOut: async () => {
          session = null;
          return true
        }
    })
}
