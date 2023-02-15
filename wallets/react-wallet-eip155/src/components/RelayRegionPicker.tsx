import { REGIONALIZED_RELAYER_ENDPOINTS } from '@/data/RelayerRegions'
import { useState } from 'react'
import { core } from '../utils/WalletConnectUtil'

export default function AccountPicker() {
  const [region, setRegion] = useState('')

  async function onSelect(newRegion: string) {
    await core.relayer.transportClose()
    await core.relayer.transportOpen(newRegion)
    setRegion(newRegion)
  }

  return (
    <select
      value={region}
      onChange={e => onSelect(e.currentTarget.value)}
      aria-label="relayerRegions"
    >
      {REGIONALIZED_RELAYER_ENDPOINTS.map((endpoint, index) => {
        return (
          <option key={index} value={endpoint.value}>
            {endpoint.label}
          </option>
        )
      })}
    </select>
  )
}
