import { useAppKitAccount } from '@reown/appkit/react'
import { useDisconnect, useAppKit } from '@reown/appkit-ethers5/react'

export function Hooks() {
  const { address, caipAddress, isConnected } = useAppKitAccount();
  const { open, close } = useAppKit();
  const { disconnect } = useDisconnect();

  // Split the caipAddress to get the chain id
  const data = caipAddress?.split(':');

  return (
    <div>
      { isConnected ? (
        <div>
          <p>Address: {address}</p>
          <p>Chain Id: {data![1]}</p>
          <p><button onClick={() => disconnect()}>disconnect hooks</button></p>
          <p><button onClick={() => open()}>open hook</button> - <button onClick={() => close()}>close hook</button></p>
        </div>
      ) : (<></>)}
    </div>
  )
}