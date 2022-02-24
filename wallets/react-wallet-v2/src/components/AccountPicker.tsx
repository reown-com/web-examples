import SettingsStore from '@/store/SettingsStore'
import { eip155Addresses } from '@/utils/EIP155WalletUtil'
import { useSnapshot } from 'valtio'

export default function AccountPicker() {
  const { address } = useSnapshot(SettingsStore.state)

  return (
    <select
      value={address}
      onChange={e => SettingsStore.setAddress(e.currentTarget.value)}
      aria-label="addresses"
    >
      <option value={eip155Addresses[0]}>Account 1</option>
      <option value={eip155Addresses[1]}>Account 2</option>
    </select>
  )
}
