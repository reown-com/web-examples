'use client'

import { useWeb3Modal } from "@web3modal/wagmi/react"

export default function Connect() {
  return <w3m-button />
}

export function Custom(){
  const { open } = useWeb3Modal()
  return <button onClick={()=>open()} >open modal</button>
}
