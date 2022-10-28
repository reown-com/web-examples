import ChainCard from '@/components/ChainCard'
import { COSMOS_MAINNET_CHAINS } from '@/data/COSMOSData'
import { EIP155_MAINNET_CHAINS, EIP155_TEST_CHAINS } from '@/data/EIP155Data'
import { SOLANA_MAINNET_CHAINS, SOLANA_TEST_CHAINS } from '@/data/SolanaData'
import { formatChainName } from '@/utils/HelperUtil'
import { Col, Row, Text } from '@nextui-org/react'
import { ProposalTypes } from '@walletconnect/types'
import { Fragment } from 'react'

/**
 * Utilities
 */
const CHAIN_METADATA = {
  ...COSMOS_MAINNET_CHAINS,
  ...SOLANA_MAINNET_CHAINS,
  ...EIP155_MAINNET_CHAINS,
  ...EIP155_TEST_CHAINS,
  ...SOLANA_TEST_CHAINS
}

/**
 * Types
 */
interface IProps {
  requiredNamespace: ProposalTypes.RequiredNamespace
}

/**
 * Component
 */
export default function SessionProposalChainCard({ requiredNamespace }: IProps) {
  return (
    <Fragment>
      {requiredNamespace.chains.map(chainId => {
        const extensionMethods: ProposalTypes.RequiredNamespace['methods'] = []
        const extensionEvents: ProposalTypes.RequiredNamespace['events'] = []

        requiredNamespace.extension?.map(({ chains, methods, events }) => {
          if (chains.includes(chainId)) {
            extensionMethods.push(...methods)
            extensionEvents.push(...events)
          }
        })

        const allMethods = [...requiredNamespace.methods, ...extensionMethods]
        const allEvents = [...requiredNamespace.events, ...extensionEvents]
        // @ts-expect-error
        const rgb = CHAIN_METADATA[chainId]?.rgb

        return (
          <ChainCard key={chainId} rgb={rgb ?? ''} flexDirection="col" alignItems="flex-start">
            <Text h5 css={{ marginBottom: '$5' }}>
              {formatChainName(chainId)}
            </Text>
            <Row>
              <Col>
                <Text h6>Methods</Text>
                <Text color="$gray300">{allMethods.length ? allMethods.join(', ') : '-'}</Text>
              </Col>
            </Row>
            <Row css={{ marginTop: '$5' }}>
              <Col>
                <Text h6>Events</Text>
                <Text color="$gray300">{allEvents.length ? allEvents.join(', ') : '-'}</Text>
              </Col>
            </Row>
          </ChainCard>
        )
      })}
    </Fragment>
  )
}
