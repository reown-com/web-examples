import {
    type SIWESession,
    type SIWEVerifyMessageArgs,
    type SIWECreateMessageArgs,
    createSIWEConfig,
    formatMessage,
  } from '@web3modal/siwe'
  

const BASE_URL = 'http://localhost:8080';

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
 const verifyMessage = async ({ message, signature }: SIWEVerifyMessageArgs) => {
    try {
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
            return false;
        }
        
        const result = await response.json();
        return result === true;
      } catch (error) {
        return false;
      }
}

// call the server to get the session
 const getSession = async () => {
   const res = await fetch(BASE_URL+ "/session", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: 'include',
  });
  if (!res.ok) {
      throw new Error('Network response was not ok');
  }
  
  const data = await res.json();
  return data == "{}" ?  null : data as SIWESession;
}

// call the server to sign out
const signOut =  async (): Promise<boolean> => {
  const res = await fetch(BASE_URL + "/signout", {
   method: "GET",
   credentials: 'include',
 });
  if (!res.ok) {
      throw new Error('Network response was not ok');
  }
 
  const data = await res.json();
  return data == "{}";
} 

export const createSIWE = (chains: [number]) => {
    return createSIWEConfig({
      signOutOnAccountChange: true,
      signOutOnNetworkChange: true,
        getMessageParams: async () => ({
              domain: window.location.host,
              uri: window.location.origin, 
              chains,
              statement: 'Please sign with your account',
            }),
        createMessage: ({ address, ...args }: SIWECreateMessageArgs) => {
          return formatMessage(args, address)
        },
        getNonce,
        getSession,
        verifyMessage,
        signOut,
    })
}
