'use client'
import { useDisconnect, useAppKit, useAppKitNetwork  } from '@reown/appkit/react'
import { networks } from '@/config'

export const ActionButtonList = () => {
    const {disconnect} = useDisconnect();
    const { open } = useAppKit();
    const { switchNetwork } = useAppKitNetwork();
  return (
    <div >
        <button onClick={() => open()}>Open</button>
        <button onClick={() => disconnect()}>Disconnect</button>
        <button onClick={() => switchNetwork(networks[1]) }>Switch</button>
    </div>
  )
}
