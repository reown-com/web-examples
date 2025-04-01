import { Text, Row, Avatar, Grid } from '@nextui-org/react'
import GenericDropdown from './GenericDropdown'

// Style variables
const styles = {
  avatarWrapper: {
    position: 'relative' as const,
    marginRight: '12px'
  }
}

// Define types for the enhanced token and network data
interface TokenWithNetworks {
  assetSymbol: string
  assetIcon: string
  assetName: string
  assetDecimals: number
  assetNamespace: string
  networks: string[]
}

// Token Dropdown Component
interface TokenDropdownProps {
  allTokens: TokenWithNetworks[]
  filteredTokens: TokenWithNetworks[]
  selectedTokenIndex: number
  onSelectToken: (index: number) => void
}

export default function TokenDropdown({
  allTokens,
  filteredTokens,
  selectedTokenIndex,
  onSelectToken
}: TokenDropdownProps) {
  const renderToken = (token: TokenWithNetworks) => (
    <Row align="center" css={{ width: '100%' }}>
      <div style={styles.avatarWrapper}>
        {token.assetIcon ? (
          <Avatar
            src={token.assetIcon}
            bordered={false}
            color="primary"
            css={{ zIndex: 1 }}
            text={token.assetSymbol.charAt(0)}
            size="sm"
          />
        ) : (
          <Avatar
            bordered={false}
            color="primary"
            css={{ zIndex: 1 }}
            text={token.assetSymbol.charAt(0)}
            size="sm"
          />
        )}
      </div>

      <Grid.Container direction="column" css={{ margin: 0, padding: 0 }}>
        <Text b size={14} css={{ lineHeight: 1.2, color: 'white' }}>
          {token.assetSymbol}
        </Text>
      </Grid.Container>
    </Row>
  )

  return (
    <div style={{ width: '100%' }}>
      <GenericDropdown
        items={filteredTokens}
        selectedIndex={selectedTokenIndex}
        setSelectedIndex={onSelectToken}
        renderItem={renderToken}
        placeholder="Select token"
        emptyMessage="No tokens available"
      />
    </div>
  )
}
