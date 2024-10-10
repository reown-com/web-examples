import { useAppKitAccount, useAppKit } from '@reown/appkit/react'
import { useDisconnect } from 'wagmi'
import { useWriteContract } from 'wagmi';
import { useSignMessage } from 'wagmi'


export function WagmiHooks() {
  const {  address, caipAddress, isConnected, status  } = useAppKitAccount();
  const { signMessageAsync } = useSignMessage()
  const { disconnect } = useDisconnect();
  const { open, close } = useAppKit();

  // Split the caipAddress to get the chain id
  const data2 = caipAddress?.split(':');

  const onSign = async () => {
    const ret = await signMessageAsync({ message: 'Hello AppKit!' })
    console.log(ret);
  }

  return (
    <div>
      {isConnected ? (
        <div>
          <p>Address: {address}</p>
          <p>Chain ID: {data2![1]}</p>
          <p>Status: {status}</p>
          <p><button onClick={() => open()}>open hook</button> - <button onClick={() => close()}>close hook</button></p>
          <p><button onClick={() => disconnect()}>Disconnect Hook</button></p>
          <button onClick={() => onSign()}>Sign</button>
        </div>
      ) : (
        <p>Not connected</p>
      )}
    </div>
  )
}