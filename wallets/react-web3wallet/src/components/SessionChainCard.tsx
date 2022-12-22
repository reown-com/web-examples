import ChainCard from '@/components/ChainCard'
import { COSMOS_MAINNET_CHAINS } from '@/data/COSMOSData'
import { EIP155_MAINNET_CHAINS, EIP155_TEST_CHAINS } from '@/data/EIP155Data'
import { NEAR_TEST_CHAINS } from '@/data/NEARData'
import { SOLANA_MAINNET_CHAINS, SOLANA_TEST_CHAINS } from '@/data/SolanaData'
import { ELROND_MAINNET_CHAINS, ELROND_TEST_CHAINS } from '@/data/ElrondData'
import { formatChainName } from '@/utils/HelperUtil'
import { Col, Row, Text } from '@nextui-org/react'
import { SessionTypes } from '@walletconnect/types'
import { Fragment } from 'react'

/**
 * Utilities
 */
const CHAIN_METADATA = {
  ...COSMOS_MAINNET_CHAINS,
  ...SOLANA_MAINNET_CHAINS,
  ...ELROND_MAINNET_CHAINS,
  ...EIP155_MAINNET_CHAINS,
  ...EIP155_TEST_CHAINS,
  ...SOLANA_TEST_CHAINS,
  ...NEAR_TEST_CHAINS,
  ...ELROND_TEST_CHAINS
}

/**
 * Types
 */
interface IProps {
  namespace: SessionTypes.Namespace
}

/**
 * Component
 */
export default function SessionChainCard({ namespace }: IProps) {
  const chains: string[] = []

  // WIP

  namespace.accounts.forEach(account => {
    const [type, chain] = account.split(':')
    const chainId = `${type}:${chain}`
    chains.push(chainId)
  })

  return (
    <Fragment>
      {chains.map(chainId => {
        const extensionMethods: SessionTypes.Namespace['methods'] = []
        const extensionEvents: SessionTypes.Namespace['events'] = []

        namespace.extension?.map(({ accounts, methods, events }) => {
          accounts.forEach(account => {
            const [type, chain] = account.split(':')
            const chainId = `${type}:${chain}`
            if (chains.includes(chainId)) {
              extensionMethods.push(...methods)
              extensionEvents.push(...events)
            }
          })
        })

        const allMethods = [...namespace.methods, ...extensionMethods]
        const allEvents = [...namespace.events, ...extensionEvents]
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
