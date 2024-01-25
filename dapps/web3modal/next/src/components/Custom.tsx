'use client'

import { useWeb3Modal } from "@web3modal/wagmi/react"
import { useAccount, useDisconnect } from "wagmi"

export default function Custom(){
  const { open } = useWeb3Modal()
  const { isConnected } = useAccount()
  const { disconnect } = useDisconnect()

  if(isConnected) return <button onClick={()=>disconnect()} >Disconnect</button>
  return <button onClick={()=>open()} >open modal</button>
}
