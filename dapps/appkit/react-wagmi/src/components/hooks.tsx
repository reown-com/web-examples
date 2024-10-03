import { useAppKitAccount, useAppKit } from '@reown/appkit/react'
import { useDisconnect } from 'wagmi'

export function WagmiHooks() {
  const {  address, caipAddress, isConnected, status  } = useAppKitAccount();
  const { disconnect } = useDisconnect();
  const { open, close } = useAppKit();

  // Split the caipAddress to get the chain id
  const data = caipAddress?.split(':');
  return (
    <div>
      {isConnected ? (
        <div>
          <p>Address: {address}</p>
          <p>Chain ID: {data![1]}</p>
          <p>Status: {status}</p>
          <p><button onClick={() => open()}>open hook</button> - <button onClick={() => close()}>close hook</button></p>
          <p><button onClick={() => disconnect()}>Disconnect Hook</button></p>
        </div>
      ) : (
        <p>Not connected</p>
      )}
    </div>
  )
}