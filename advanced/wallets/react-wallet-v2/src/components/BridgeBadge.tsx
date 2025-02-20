import { Icon } from '@mui/material'
import bridgeIcon from './../../public/bridge.png'

export default function BridgeBadge() {
  return (
    <div
      style={{
        width: 27,
        height: 27,
        borderRadius: 12,
        backgroundColor: '#363636',
        flexDirection: 'row',
        justifyContent: 'space-evenly'
      }}
    >
      <img
        style={{
          width: 16,
          height: 16,
          margin: 5
        }}
        src="./../../bridge.png"
      />
    </div>
  )
}
