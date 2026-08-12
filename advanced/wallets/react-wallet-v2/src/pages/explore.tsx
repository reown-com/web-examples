// Dapps directory (picker). Open mode (iframe / popup modal / new tab) is a
// global setting — see Settings → Dapps open mode.
import PageHeader from '@/components/PageHeader'
import EmbeddedDappBrowser from '@/components/EmbeddedDappBrowser'
import SettingsStore from '@/store/SettingsStore'
import PickerStore, { setPickerPopup } from '@/store/PickerStore'
import {
  EXPLORE_DAPPS,
  ExploreDapp,
  buildPickerUrl
} from '@/data/ExploreDapps'
import { Button, Card, Modal, Row, Text } from '@nextui-org/react'
import Link from 'next/link'
import { Fragment, useState } from 'react'
import { useSnapshot } from 'valtio'

const CHAIN_LABEL: Record<ExploreDapp['aggregator'], string> = {
  jupiter: 'Solana',
  oneinch: 'Arbitrum',
  kyberswap: 'Arbitrum',
  uniswap: 'Arbitrum'
}

export default function ExplorePage() {
  const { explorerAutoConnectEnabled, explorerConnectVariant, explorerOpenMode } = useSnapshot(
    SettingsStore.state
  )
  const { activeDapp, activeMode } = useSnapshot(PickerStore.state)
  const [consentDapp, setConsentDapp] = useState<ExploreDapp | null>(null)

  // Build the picker URL contract and open the dapp per the chosen open mode.
  // iframe + popup are framed and live in-page (no window.open); only new-tab
  // opens a separate context, and that window.open MUST run inside the click
  // gesture (here) or the popup blocker eats it.
  function openDapp(dapp: ExploreDapp) {
    const hostOrigin = window.location.origin
    const url = buildPickerUrl(dapp, explorerConnectVariant, hostOrigin)
    if (explorerOpenMode === 'newtab') {
      setPickerPopup(window.open(url, `wc_picker_${dapp.id}`)) // separate tab; opener preserved
    }
    PickerStore.openDapp(dapp, url, explorerOpenMode)
  }

  function onTileClick(dapp: ExploreDapp) {
    if (explorerAutoConnectEnabled) {
      openDapp(dapp)
    } else {
      // First tap (or consent revoked): ask before auto-connecting.
      setConsentDapp(dapp)
    }
  }

  function grantConsentAndOpen() {
    const dapp = consentDapp
    SettingsStore.setExplorerAutoConnect(true)
    setConsentDapp(null)
    if (dapp) openDapp(dapp)
  }

  // iframe mode takes over the Dapps content area (an in-wallet screen). popup
  // (a modal) and new-tab render as an overlay above the tile grid, so the
  // catalog stays behind.
  if (activeDapp && activeMode === 'iframe') {
    return (
      <Fragment>
        <EmbeddedDappBrowser />
      </Fragment>
    )
  }

  return (
    <Fragment>
      <PageHeader title="Dapps" />

      <Text css={{ color: '$gray500', marginBottom: '$8' }}>
        Fee-honoring dapps. Tap one to open it inside the wallet with a monetized
        WalletConnect session already established — no connect screen.
      </Text>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {EXPLORE_DAPPS.map(dapp => (
          <Card
            key={dapp.id}
            clickable
            hoverable
            bordered
            borderWeight="light"
            onClick={() => onTileClick(dapp)}
            data-testid={`explore-tile-${dapp.id}`}
            css={{ width: '100%' }}
          >
            <Card.Body css={{ alignItems: 'center', gap: '$4', py: '$8' }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: dapp.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28
                }}
              >
                {dapp.icon}
              </div>
              <Text b css={{ margin: 0 }}>
                {dapp.name}
              </Text>
              <Text small css={{ color: '$gray500', margin: 0 }}>
                Swap · {CHAIN_LABEL[dapp.aggregator]}
              </Text>
            </Card.Body>
          </Card>
        ))}
      </div>

      <Row justify="space-between" align="center" css={{ marginTop: '$10' }}>
        <Text small css={{ color: '$gray500' }}>
          Auto-connect: {explorerAutoConnectEnabled ? 'On' : 'Off'} · Variant: {explorerConnectVariant}
        </Text>
        <Link href="/settings" passHref>
          <Text small css={{ color: '$primary', cursor: 'pointer' }}>
            Manage in Settings
          </Text>
        </Link>
      </Row>

      {/* popup (modal) / new-tab render as an overlay above the tile grid */}
      {activeDapp && <EmbeddedDappBrowser />}

      {/* One-time consent dialog */}
      <Modal
        blur
        open={!!consentDapp}
        onClose={() => setConsentDapp(null)}
        css={{ maxWidth: '420px', margin: '0 auto' }}
      >
        <Modal.Header>
          <Text h4 css={{ margin: 0 }}>
            Auto-connect to Explore dapps?
          </Text>
        </Modal.Header>
        <Modal.Body>
          <Text css={{ color: '$gray600' }}>
            Dapps you open from Explore will be connected automatically — no approval
            screen — using this wallet&apos;s accounts, with the wallet&apos;s fee terms
            attached. Every transaction still needs your signature. You can turn this off
            anytime in Settings.
          </Text>
        </Modal.Body>
        <Modal.Footer>
          <Button auto flat color="error" onClick={() => setConsentDapp(null)} data-testid="consent-decline">
            Not now
          </Button>
          <Button auto onClick={grantConsentAndOpen} data-testid="consent-allow">
            Allow auto-connect
          </Button>
        </Modal.Footer>
      </Modal>
    </Fragment>
  )
}
