import SettingsStore from '@/store/SettingsStore'
import { useSnapshot } from 'valtio'

/**
 * Small pill indicating which Pay environment (production / staging) the
 * wallet is currently configured to use. Driven by the settings toggle.
 */
export default function PayEnvPill() {
  const { payStagingEnabled } = useSnapshot(SettingsStore.state)

  const label = payStagingEnabled ? 'Staging' : 'Production'
  const color = payStagingEnabled ? '#F5A623' : '#17C964'

  return (
    <span
      data-testid="pay-env-pill"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '2px 10px',
        borderRadius: '999px',
        border: `1px solid ${color}`,
        color,
        fontSize: '11px',
        fontWeight: 600,
        lineHeight: 1.6,
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap'
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: color
        }}
      />
      {label}
    </span>
  )
}
