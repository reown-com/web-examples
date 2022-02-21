import SettingsStore from '@/store/SettingsStore'
import { useSnapshot } from 'valtio'

export default function AccountPicker() {
  const { account } = useSnapshot(SettingsStore.state)

  return (
    <select
      value={account}
      onChange={e => SettingsStore.setAccount(e.currentTarget.value)}
      aria-label="accounts"
    >
      <option value={0}>Account 1</option>
      <option value={1}>Account 2</option>
    </select>
  )
}
