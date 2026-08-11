import Navigation from '@/components/Navigation'
import RouteTransition from '@/components/RouteTransition'
import SettingsStore from '@/store/SettingsStore'
import { Loading, Text } from '@nextui-org/react'
import Image from 'next/image'
import { ReactNode } from 'react'
import { useSnapshot } from 'valtio'

/**
 * Types
 */
interface Props {
  initialized: boolean
  children: ReactNode | ReactNode[]
}

/**
 * Institutional custody-console shell: a fixed left sidebar (brand + vertical
 * nav + account) and a wide, light main content area — instead of the mobile
 * phone-card with a bottom tab bar.
 */
export default function Layout({ children, initialized }: Props) {
  const { eip155Address } = useSnapshot(SettingsStore.state)
  const shortAddress = eip155Address
    ? `${eip155Address.slice(0, 6)}…${eip155Address.slice(-4)}`
    : ''

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        background: '#f5f6f8',
        color: '#1a1d23',
        overflow: 'hidden'
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: 256,
          minWidth: 256,
          background: '#ffffff',
          borderRight: '1px solid #ecedf1',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 14px'
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px 0' }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: '#eaf0ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Image alt="logo" src="/wallet-connect-logo.svg" width={20} height={20} />
          </div>
          <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>React Wallet</div>
            <div style={{ fontSize: 11, color: '#8a8f98' }}>Demo custody console</div>
          </div>
        </div>

        {initialized && <Navigation />}

        {/* Account footer */}
        <div style={{ marginTop: 'auto' }}>
          {shortAddress ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderTop: '1px solid #ecedf1',
                marginTop: 12
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg,#2E5CFF,#7C3AED)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0
                }}
              >
                W
              </div>
              <div style={{ lineHeight: 1.2, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Demo account</div>
                <div
                  style={{
                    fontSize: 11,
                    color: '#8a8f98',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace'
                  }}
                >
                  {shortAddress}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </aside>

      {/* Main content */}
      <main
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {initialized ? (
          <RouteTransition>
            <div style={{ height: '100%', overflowY: 'auto', padding: '32px 40px' }}>
              <div style={{ maxWidth: 960, margin: '0 auto', width: '100%' }}>{children}</div>
            </div>
          </RouteTransition>
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              textAlign: 'center'
            }}
          >
            <Loading size="lg" />
            <Text size="$lg" css={{ marginTop: '$4' }}>
              Initializing wallet...
            </Text>
            <Text size="$sm" color="$gray600">
              This may take a few moments
            </Text>
          </div>
        )}
      </main>
    </div>
  )
}
