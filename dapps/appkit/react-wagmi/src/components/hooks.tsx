import { useAppKitAccount } from '@reown/appkit/react'
import { useAccount, useDisconnect } from 'wagmi'

export function WagmiHooks() {
  const { address } = useAppKitAccount();
  const { isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();


  return (
    <div>
      {isConnected ? (
        <div>
          <p>Address: {address}</p>
          <p>Chain ID: {chainId}</p>
          <p><button onClick={() => disconnect()}>Disconnect Hook</button></p>
        </div>
      ) : (
        <p>Not connected</p>
      )}
    </div>
  )
}