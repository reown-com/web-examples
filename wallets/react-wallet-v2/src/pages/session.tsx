import PageHeader from '@/components/PageHeader'
import ProjectInfoCard from '@/components/ProjectInfoCard'
import SessionSelectSection from '@/components/SessionSelectSection'
import { COSMOS_MAINNET_CHAINS, TCosmosChain } from '@/data/COSMOSData'
import { EIP155_CHAINS, TEIP155Chain } from '@/data/EIP155Data'
import { SOLANA_CHAINS, TSolanaChain } from '@/data/SolanaData'
import { cosmosAddresses } from '@/utils/CosmosWalletUtil'
import { eip155Addresses } from '@/utils/EIP155WalletUtil'
import { isCosmosChain, isEIP155Chain, isSolanaChain } from '@/utils/HelperUtil'
import { solanaAddresses } from '@/utils/SolanaWalletUtil'
import { walletConnectClient } from '@/utils/WalletConnectUtil'
import { Button, Col, Divider, Row, Text } from '@nextui-org/react'
import { ERROR } from '@walletconnect/utils'
import { useRouter } from 'next/router'
import { Fragment, useEffect, useState } from 'react'

/**
 * Component
 */
export default function SessionPage() {
  const [topic, setTopic] = useState('')
  const [updated, setUpdated] = useState(new Date())
  const { query, replace } = useRouter()

  useEffect(() => {
    if (query?.topic) {
      setTopic(query.topic as string)
    }
  }, [query])

  const session = walletConnectClient.session.values.find(s => s.topic === topic)

  if (!session) {
    return null
  }

  // Get necessary data from session
  const expiryDate = new Date(session.expiry * 1000)
  const { chains } = session.permissions.blockchain
  const { methods } = session.permissions.jsonrpc
  const { accounts } = session.state

  // Handle deletion of a session
  async function onDeleteSession() {
    await walletConnectClient.session.delete({
      topic,
      reason: ERROR.DELETED.format()
    })
    replace('/sessions')
  }

  // Hanlde deletion of session account
  async function onDeleteAccount(account: string) {
    const newAccounts = accounts.filter(a => a !== account)
    await walletConnectClient.session.update({
      topic,
      state: {
        accounts: newAccounts
      }
    })
    setUpdated(new Date())
  }

  // Handle addition of account to the session
  async function onAddAccount(account: string) {
    await walletConnectClient.session.update({
      topic,
      state: {
        accounts: [...accounts, account]
      }
    })
    setUpdated(new Date())
  }

  return (
    <Fragment>
      <PageHeader title="Session Details" />

      <ProjectInfoCard metadata={session.peer.metadata} />

      {chains.map(chain => {
        if (isEIP155Chain(chain)) {
          return (
            <SessionSelectSection
              key={chain}
              chain={chain}
              name={EIP155_CHAINS[chain as TEIP155Chain]?.name}
              addresses={eip155Addresses}
              selectedAddresses={accounts}
              onDelete={onDeleteAccount}
              onAdd={onAddAccount}
            />
          )
        } else if (isCosmosChain(chain)) {
          return (
            <SessionSelectSection
              key={chain}
              chain={chain}
              name={COSMOS_MAINNET_CHAINS[chain as TCosmosChain]?.name}
              addresses={cosmosAddresses}
              selectedAddresses={accounts}
              onDelete={onDeleteAccount}
              onAdd={onAddAccount}
            />
          )
        } else if (isSolanaChain(chain)) {
          return (
            <SessionSelectSection
              key={chain}
              chain={chain}
              name={SOLANA_CHAINS[chain as TSolanaChain]?.name}
              addresses={solanaAddresses}
              selectedAddresses={accounts}
              onDelete={onDeleteAccount}
              onAdd={onAddAccount}
            />
          )
        }
      })}

      <Divider y={1} />

      <Row>
        <Col>
          <Text h5>Methods</Text>
          <Text color="$gray400">{methods.map(method => method).join(', ')}</Text>
        </Col>
      </Row>

      <Divider y={1} />

      <Row justify="space-between">
        <Text h5>Expiry</Text>
        <Text css={{ color: '$gray400' }}>{expiryDate.toDateString()}</Text>
      </Row>

      <Divider y={1} />

      <Row justify="space-between">
        <Text h5>Last Updated</Text>
        <Text css={{ color: '$gray400' }}>{updated.toDateString()}</Text>
      </Row>

      <Divider y={1} />

      <Row>
        <Button flat css={{ width: '100%' }} color="error" onClick={onDeleteSession}>
          Delete Session
        </Button>
      </Row>
    </Fragment>
  )
}
