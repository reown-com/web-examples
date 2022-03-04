import AccountSelectCard from '@/components/AccountSelectCard'
import ProjectInfoCard from '@/components/ProjectInfoCard'
import RequesDetailsCard from '@/components/RequestDetalilsCard'
import RequestMethodCard from '@/components/RequestMethodCard'
import RequestModalContainer from '@/components/RequestModalContainer'
import { COSMOS_MAINNET_CHAINS, TCosmosChain } from '@/data/COSMOSData'
import { EIP155_CHAINS, TEIP155Chain } from '@/data/EIP155Data'
import ModalStore from '@/store/ModalStore'
import { cosmosAddresses } from '@/utils/CosmosWalletUtil'
import { eip155Addresses } from '@/utils/EIP155WalletUtil'
import { isCosmosChain, isEIP155Chain } from '@/utils/HelperUtil'
import { walletConnectClient } from '@/utils/WalletConnectUtil'
import { Button, Col, Divider, Modal, Row, Text } from '@nextui-org/react'
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
      const accounts = [...selectedEIP155, ...selectedCosmos]
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
      <RequestModalContainer title="Session Proposal">
        <ProjectInfoCard metadata={proposer.metadata} />

        <Divider y={2} />

        <RequesDetailsCard chains={chains} protocol={relay.protocol} />

        <Divider y={2} />

        <RequestMethodCard methods={methods} />

        {chains.map(chain => {
          if (isEIP155Chain(chain)) {
            return (
              <Fragment>
                <Divider y={2} />

                <Row>
                  <Col>
                    <Text h5>{`Select ${EIP155_CHAINS[chain as TEIP155Chain].name} Accounts`}</Text>
                    {eip155Addresses.map((address, index) => (
                      <AccountSelectCard
                        key={address}
                        address={address}
                        index={index}
                        onSelect={() => onSelectEIP155(`${chain}:${address}`)}
                        selected={selectedEIP155.includes(`${chain}:${address}`)}
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
                    <Text h5>
                      {`Select ${COSMOS_MAINNET_CHAINS[chain as TCosmosChain].name} Accounts`}
                    </Text>
                    {cosmosAddresses.map((address, index) => (
                      <AccountSelectCard
                        key={address}
                        address={address}
                        index={index}
                        onSelect={() => onSelectCosmos(`${chain}:${address}`)}
                        selected={selectedCosmos.includes(`${chain}:${address}`)}
                      />
                    ))}
                  </Col>
                </Row>
              </Fragment>
            )
          }
        })}
      </RequestModalContainer>

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
