import SettingsStore from '@/store/SettingsStore'
import { addresses } from '@/utils/WalletUtil'
import { useSnapshot } from 'valtio'

export default function AccountPicker() {
  const { address } = useSnapshot(SettingsStore.state)

  return (
    <select
      value={address}
      onChange={e => SettingsStore.setAddress(e.currentTarget.value)}
      aria-label="addresses"
    >
      <option value={addresses[0]}>Account 1</option>
      <option value={addresses[1]}>Account 2</option>
    </select>
  )
}
