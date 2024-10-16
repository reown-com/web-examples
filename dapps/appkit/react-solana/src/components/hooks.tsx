import { useAppKitAccount, useAppKit, useAppKitProvider } from '@reown/appkit/react'
import { useRef } from "react";
import type { Provider } from '@reown/appkit-adapter-solana'
import base58 from 'bs58';

export function SolanaHooks() {
  const txtConsoleRef = useRef(null);
  const { address, caipAddress, isConnected, status } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider<Provider>('solana')
  const { open, close } = useAppKit();

  
  const handleFaucet = async () => {
    // redirect to
    window.open('https://solfaucet.com/', '_blank');
  }

  const printConsole = (msg: string) => {
    const txtConsole = txtConsoleRef.current as HTMLTextAreaElement | null;
    txtConsole!.value = msg;
    console.log(msg);
  }

  const handleSign = async () => {
    try {
      if (!walletProvider) {
        throw Error('user is disconnected')
      }

      const encodedMessage = new TextEncoder().encode('Hello from AppKit')
      const signature = await walletProvider.signMessage(encodedMessage)

      const base58SignatureValue = base58.encode(signature)

      printConsole(`Signature: ${base58SignatureValue}`);
    } catch (error) {
      console.error('Error signing message:', error)
    }
  }

  
  // Split the caipAddress to get the chain id
  const data = caipAddress?.split(':');

  return (
    <div>
      { isConnected ? (
        <div>
          <p>Address: {address}</p>
          <p>Chain Id: {data![1]}</p>
          <p>Status: {status}</p>
          <p><button onClick={() => open()}>open hook</button> - <button onClick={() => close()}>close hook</button></p>
          
          <div className="btn-container">
            <button onClick={handleFaucet}>Solana faucet</button> - <button onClick={handleSign}>Sign MSG</button>
          </div>
          <br />
          <div>
            <textarea className="console" ref={txtConsoleRef} readOnly style={{ width: '100%' }}>
              
            </textarea>
          </div>
        </div>
      ) : (<></>)}
    </div>
  )
}