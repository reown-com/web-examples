import { useAppKitAccount, useAppKit } from '@reown/appkit/react'

export function SolanaHooks() {
  const { address, caipAddress, isConnected, status } = useAppKitAccount();
  const { open, close } = useAppKit();

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
        </div>
      ) : (<></>)}
    </div>
  )
}