import AccountSelectCard from '@/components/AccountSelectCard'
import ProjectInfoCard from '@/components/ProjectInfoCard'
import { COSMOS_MAINNET_CHAINS, TCosmosChain } from '@/data/COSMOSData'
import { EIP155_CHAINS, TEIP155Chain } from '@/data/EIP155Data'
import ModalStore from '@/store/ModalStore'
import { cosmosAddresses } from '@/utils/CosmosWalletUtil'
import { eip155Addresses } from '@/utils/EIP155WalletUtil'
import { isCosmosChain, isEIP155Chain } from '@/utils/HelperUtil'
import { walletConnectClient } from '@/utils/WalletConnectUtil'
import { Button, Col, Container, Divider, Modal, Row, Text } from '@nextui-org/react'
import { Fragment, useState } from 'react'

export default function SessionProposalModal() {
  const [selectedEIP155, setSelectedEip155] = useState<string[]>([])
  const [selectedCosmos, setSelectedCosmos] = useState<string[]>([])

  // Get proposal data and wallet address from store
  const proposal = ModalStore.state.data?.proposal

  // Ensure proposal is defined
  if (!proposal) {
    return <Text>Missing proposal data</Text>
  }

  // Get required proposal data
  const { proposer, permissions, relay } = proposal
  const { chains } = permissions.blockchain
  const { methods } = permissions.jsonrpc
  const { protocol } = relay

  // Add / remove address from EIP155 selection
  function onSelectEIP155(address: string) {
    if (selectedEIP155.includes(address)) {
      const newAddresses = selectedEIP155.filter(a => a !== address)
      setSelectedEip155(newAddresses)
    } else {
      setSelectedEip155([...selectedEIP155, address])
    }
  }

  // Add / remove address from Cosmos selection
  function onSelectCosmos(address: string) {
    if (selectedCosmos.includes(address)) {
      const newAddresses = selectedCosmos.filter(a => a !== address)
      setSelectedCosmos(newAddresses)
    } else {
      setSelectedCosmos([...selectedCosmos, address])
    }
  }

  // Hanlde approve action
  async function onApprove() {
    if (proposal) {
      const accounts: string[] = []
      chains.forEach(chain => {
        if (isEIP155Chain(chain)) {
          selectedEIP155.forEach(address => {
            accounts.push(`${chain}:${address}`)
          })
        } else if (isCosmosChain(chain)) {
          selectedCosmos.forEach(address => {
            accounts.push(`${chain}:${address}`)
          })
        }
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
          <ProjectInfoCard metadata={proposer.metadata} />

          <Row>
            <Col>
              <Text h5>Blockchains</Text>
              <Text color="$gray400">
                {chains
                  .map(
                    chain =>
                      EIP155_CHAINS[chain as TEIP155Chain]?.name ??
                      COSMOS_MAINNET_CHAINS[chain as TCosmosChain]?.name ??
                      chain
                  )
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

          {chains.map(chain => {
            if (isEIP155Chain(chain)) {
              return (
                <Fragment>
                  <Divider y={2} />

                  <Row>
                    <Col>
                      <Text h5>Select EIP155 Accounts</Text>
                      {eip155Addresses.map((address, index) => (
                        <AccountSelectCard
                          key={address}
                          address={address}
                          index={index}
                          onSelect={() => onSelectEIP155(address)}
                          selected={selectedEIP155.includes(address)}
                        />
                      ))}
                    </Col>
                  </Row>
                </Fragment>
              )
            } else if (isCosmosChain(chain)) {
              return (
                <Fragment>
                  <Divider y={2} />

                  <Row>
                    <Col>
                      <Text h5>Select Cosmos Accounts</Text>
                      {cosmosAddresses.map((address, index) => (
                        <AccountSelectCard
                          key={address}
                          address={address}
                          index={index}
                          onSelect={() => onSelectCosmos(address)}
                          selected={selectedCosmos.includes(address)}
                        />
                      ))}
                    </Col>
                  </Row>
                </Fragment>
              )
            }
          })}
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
          disabled={![...selectedEIP155, ...selectedCosmos].length}
          css={{ opacity: [...selectedEIP155, ...selectedCosmos].length ? 1 : 0.4 }}
        >
          Approve
        </Button>
      </Modal.Footer>
    </Fragment>
  )
}
