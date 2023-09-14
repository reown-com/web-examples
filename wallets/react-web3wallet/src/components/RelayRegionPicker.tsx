import { REGIONALIZED_RELAYER_ENDPOINTS } from '@/data/RelayerRegions'
import SettingsStore from '@/store/SettingsStore'
import { useSnapshot } from 'valtio'

export default function AccountPicker() {
  const { relayerRegionURL } = useSnapshot(SettingsStore.state)

  function onSelect(value: string) {
    SettingsStore.setRelayerRegionURL(value)
  }

  return (
    <select
      value={relayerRegionURL}
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
