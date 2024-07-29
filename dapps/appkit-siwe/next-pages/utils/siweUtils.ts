import {
    type SIWESession,
    type SIWEVerifyMessageArgs,
    type SIWECreateMessageArgs,
    createSIWEConfig,
    formatMessage,
  } from '@web3modal/siwe'
  import { getCsrfToken, getSession as GetSessionNextAuth, signIn, signOut as SignOutNextAuth } from 'next-auth/react';
  import { useAccount, useDisconnect } from 'wagmi';
  
const getNonce = async (): Promise<string> => {
    const nonce = await getCsrfToken();
    if (!nonce) {
        throw new Error('Failed to get nonce!');
    }
    return nonce;
}
  
const verifyMessage = async ({ message, signature }: SIWEVerifyMessageArgs) => {
    try {
        const success = await signIn('credentials', {
          message,
          redirect: false,
          signature,
          callbackUrl: '/protected',
        });
  
        return Boolean(success?.ok);
      } catch (error) {
        return false;
      }
}

const getSession = async () => {
    const session:any = await GetSessionNextAuth();

    if (!session) {
      throw new Error('Failed to get session!');
    }
    const sessionData = session as SIWESession;
    return sessionData;
}

const signOut =  async () => {
    try {
        console.log('signing out');
       
        const data = await SignOutNextAuth({
            redirect: false,
          });
          
          console.log('data', data);
        return true;
      } catch (error) {
        return false;
      }
}

export const createSIWE = (chains: [number]) => {
    return createSIWEConfig({
        signOutOnAccountChange: true,
        signOutOnNetworkChange: true,
        getMessageParams: async () => ({
              domain: window.location.host,
              uri: window.location.origin, 
              chains: chains,
              statement: 'Please sign with your account',
            }),
        createMessage: ({ address, ...args }: SIWECreateMessageArgs) => formatMessage(args, address),
        getNonce,
        getSession,
        verifyMessage,
        signOut,
    })
}
