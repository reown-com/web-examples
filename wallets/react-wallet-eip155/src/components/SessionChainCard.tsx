import ChainCard from '@/components/ChainCard'
import { EIP155_MAINNET_CHAINS, EIP155_TEST_CHAINS } from '@/data/EIP155Data'
import { formatChainName } from '@/utils/HelperUtil'
import { Col, Row, Text } from '@nextui-org/react'
import { SessionTypes } from '@walletconnect/types'
import { Fragment } from 'react'

/**
 * Utilities
 */
const CHAIN_METADATA = {
  ...EIP155_MAINNET_CHAINS,
  ...EIP155_TEST_CHAINS
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
                <Text color="$gray800">
                  {namespace.methods.length ? namespace.methods.join(', ') : '-'}
                </Text>
              </Col>
            </Row>
            <Row css={{ marginTop: '$5' }}>
              <Col>
                <Text h6>Events</Text>
                <Text color="$gray800">
                  {namespace.events.length ? namespace.events.join(', ') : '-'}
                </Text>
              </Col>
            </Row>
          </ChainCard>
        )
      })}
    </Fragment>
  )
}
