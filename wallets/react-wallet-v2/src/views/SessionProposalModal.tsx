import { EIP155_CHAINS, TEIP155Chain } from '@/data/EIP155Data'
import ModalStore from '@/store/ModalStore'
import { walletConnectClient } from '@/utils/WalletConnectUtil'
import { addresses } from '@/utils/WalletUtil'
import {
  Avatar,
  Button,
  Card,
  Checkbox,
  Col,
  Container,
  Divider,
  Link,
  Modal,
  Row,
  Text
} from '@nextui-org/react'
import { Fragment, useState } from 'react'

export default function SessionProposalModal() {
  const [selectedAddresses, setSelectedAddresses] = useState<string[]>([])

  // Get proposal data and wallet address from store
  const proposal = ModalStore.state.data?.proposal

  // Ensure proposal is defined
  if (!proposal) {
    return <Text>Missing proposal data</Text>
  }

  // Get required proposal data
  const { proposer, permissions, relay } = proposal
  const { icons, name, url } = proposer.metadata
  const { chains } = permissions.blockchain
  const { methods } = permissions.jsonrpc
  const { protocol } = relay

  // Add / remove address from selection
  function onSelectAddress(address: string) {
    if (selectedAddresses.includes(address)) {
      const newAddresses = selectedAddresses.filter(a => a !== address)
      setSelectedAddresses(newAddresses)
    } else {
      setSelectedAddresses([...selectedAddresses, address])
    }
  }

  // Hanlde approve action
  async function onApprove() {
    if (proposal) {
      const accounts: string[] = []
      chains.forEach(chain => {
        selectedAddresses.forEach(address => {
          accounts.push(`${chain}:${address}`)
        })
      })

      const response = {
        state: {
          accounts
        }
      }
      await walletConnectClient.approve({ proposal, response })
    }
    ModalStore.close()
  }

  // Hanlde reject action
  async function onReject() {
    if (proposal) {
      await walletConnectClient.reject({ proposal })
    }
    ModalStore.close()
  }

  return (
    <Fragment>
      <Modal.Header>
        <Text h3>Session Proposal</Text>
      </Modal.Header>

      <Modal.Body>
        <Container css={{ padding: 0 }}>
          <Row align="center">
            <Col span={3}>
              <Avatar src={icons[0]} />
            </Col>
            <Col span={14}>
              <Text h5>{name}</Text>
              <Link href={url}>{url}</Link>
            </Col>
          </Row>

          <Divider y={2} />

          <Row>
            <Col>
              <Text h5>Blockchains</Text>
              <Text color="$gray400">
                {chains
                  .map(chain => EIP155_CHAINS[chain as TEIP155Chain]?.name ?? chain)
                  .join(', ')}
              </Text>
            </Col>
          </Row>

          <Divider y={2} />

          <Row>
            <Col>
              <Text h5>Methods</Text>
              <Text color="$gray400">{methods.map(method => method).join(', ')}</Text>
            </Col>
          </Row>

          <Divider y={2} />

          <Row>
            <Col>
              <Text h5>Relay Protocol</Text>
              <Text color="$gray400">{protocol}</Text>
            </Col>
          </Row>

          <Divider y={2} />

          <Row>
            <Col>
              <Text h5>Select Accounts to Connect</Text>
              {addresses.map((address, index) => (
                <Card
                  onClick={() => onSelectAddress(address)}
                  clickable
                  key={address}
                  css={{
                    marginTop: '$5',
                    backgroundColor: selectedAddresses.includes(address)
                      ? 'rgba(23, 200, 100, 0.2)'
                      : '$accents2'
                  }}
                >
                  <Row justify="space-between" align="center">
                    <Checkbox
                      size="lg"
                      color="success"
                      checked={selectedAddresses.includes(address)}
                    />

                    <Text>{`Account ${index + 1}`} </Text>
                  </Row>
                </Card>
              ))}
            </Col>
          </Row>
        </Container>
      </Modal.Body>

      <Modal.Footer>
        <Button auto flat color="error" onClick={onReject}>
          Reject
        </Button>

        <Button
          auto
          flat
          color="success"
          onClick={onApprove}
          disabled={!selectedAddresses.length}
          css={{ opacity: selectedAddresses.length ? 1 : 0.4 }}
        >
          Approve
        </Button>
      </Modal.Footer>
    </Fragment>
  )
}
