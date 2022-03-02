import AccountSelectCard from '@/components/AccountSelectCard'
import PageHeader from '@/components/PageHeader'
import { cosmosAddresses } from '@/utils/CosmosWalletUtil'
import { eip155Addresses } from '@/utils/EIP155WalletUtil'
import { isCosmosChain, isEIP155Chain, truncate } from '@/utils/HelperUtil'
import { walletConnectClient } from '@/utils/WalletConnectUtil'
import { Avatar, Button, Col, Divider, Link, Row, Text } from '@nextui-org/react'
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
  const { name, url, icons } = session.peer.metadata
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

      <Row align="center">
        <Col css={{ flex: 1 }}>
          <Avatar size="xl" src={icons[0]} />
        </Col>
        <Col css={{ marginLeft: '$5' }}>
          <Text h5>{name}</Text>
          <Link css={{ marginLeft: '$5' }} href={url}>
            {truncate(url?.split('https://')[1] ?? 'Unknown', 23)}
          </Link>
        </Col>
      </Row>

      {chains.map(chain => {
        if (isEIP155Chain(chain)) {
          return (
            <Fragment key={chain}>
              <Divider y={1} />

              <Row>
                <Col>
                  <Text h5>EIP155 Accounts</Text>
                  {eip155Addresses.map((address, index) => {
                    const fullAddress = `${chain}:${address}`
                    const selected = accounts.includes(fullAddress)

                    return (
                      <AccountSelectCard
                        key={address}
                        address={address}
                        index={index}
                        onSelect={() =>
                          selected ? onDeleteAccount(fullAddress) : onAddAccount(fullAddress)
                        }
                        selected={selected}
                      />
                    )
                  })}
                </Col>
              </Row>
            </Fragment>
          )
        } else if (isCosmosChain(chain)) {
          return (
            <Fragment key={chain}>
              <Divider y={1} />

              <Row>
                <Col>
                  <Text h5>Cosmos Accounts</Text>
                  {cosmosAddresses.map((address, index) => {
                    const fullAddress = `${chain}:${address}`
                    const selected = accounts.includes(fullAddress)

                    return (
                      <AccountSelectCard
                        key={address}
                        address={address}
                        index={index}
                        onSelect={() =>
                          selected ? onDeleteAccount(fullAddress) : onAddAccount(fullAddress)
                        }
                        selected={selected}
                      />
                    )
                  })}
                </Col>
              </Row>
            </Fragment>
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
