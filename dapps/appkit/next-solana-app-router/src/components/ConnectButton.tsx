'use client'
import { useEffect } from 'react'
import { useAppKitAccount } from '@reown/appkit/react'

const compactHash = (hash: string) => {
  return hash.slice(0, 7) + '...' + hash.slice(-5)
}

export const ConnectButton = () => {
  const { isConnected, address, caipAddress } = useAppKitAccount()

  return (
    <div >
        <appkit-button />
    </div>
  )
}
