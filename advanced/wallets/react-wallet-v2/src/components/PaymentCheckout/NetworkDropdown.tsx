import { Text, Row, Grid } from '@nextui-org/react'
import Image from 'next/image'
import GenericDropdown from './GenericDropdown'

// Style variables
const styles = {
  avatarWrapper: {
    position: 'relative' as const,
    marginRight: '12px'
  },
  chainImage: {
    objectFit: 'cover' as const,
    borderRadius: '50%'
  }
}

interface NetworkWithTokens {
  chainId: string
  chainName: string
  chainNamespace: string
  chainIcon: string
  tokens: string[]
}

// Network Dropdown Component
interface NetworkDropdownProps {
  allNetworks: NetworkWithTokens[]
  filteredNetworks: NetworkWithTokens[]
  selectedNetworkIndex: number
  onSelectNetwork: (index: number) => void
}

export default function NetworkDropdown({
  allNetworks,
  filteredNetworks,
  selectedNetworkIndex,
  onSelectNetwork
}: NetworkDropdownProps) {
  const renderNetwork = (network: NetworkWithTokens) => (
    <Row align="center" css={{ width: '100%' }}>
      {network.chainIcon && (
        <div style={{ ...styles.avatarWrapper, marginRight: '12px' }}>
          <Image
            src={network.chainIcon}
            width={24}
            height={24}
            style={styles.chainImage}
            alt={network.chainName}
          />
        </div>
      )}

      <Grid.Container direction="column" css={{ margin: 0, padding: 0 }}>
        <Text b size={14} css={{ lineHeight: 1.2, color: 'white' }}>
          {network.chainName}
        </Text>
      </Grid.Container>
    </Row>
  )

  return (
    <div style={{ width: '100%' }}>
      <GenericDropdown
        items={filteredNetworks}
        selectedIndex={selectedNetworkIndex}
        setSelectedIndex={onSelectNetwork}
        renderItem={renderNetwork}
        placeholder="Select network"
        emptyMessage="No networks available"
      />
    </div>
  )
}
