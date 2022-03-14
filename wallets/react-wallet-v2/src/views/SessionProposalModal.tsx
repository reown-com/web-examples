import ProjectInfoCard from '@/components/ProjectInfoCard'
import ProposalSelectSection from '@/components/ProposalSelectSection'
import RequesDetailsCard from '@/components/RequestDetalilsCard'
import RequestMethodCard from '@/components/RequestMethodCard'
import RequestModalContainer from '@/components/RequestModalContainer'
import { COSMOS_MAINNET_CHAINS, TCosmosChain } from '@/data/COSMOSData'
import { EIP155_CHAINS, TEIP155Chain } from '@/data/EIP155Data'
import { SOLANA_MAINNET_CHAINS, TSolanaChain } from '@/data/SolanaData'
import ModalStore from '@/store/ModalStore'
import { cosmosAddresses } from '@/utils/CosmosWalletUtil'
import { eip155Addresses } from '@/utils/EIP155WalletUtil'
import { isCosmosChain, isEIP155Chain, isSolanaChain } from '@/utils/HelperUtil'
import { solanaAddresses } from '@/utils/SolanaWalletUtil'
import { walletConnectClient } from '@/utils/WalletConnectUtil'
import { Button, Divider, Modal, Text } from '@nextui-org/react'
import { Fragment, useState } from 'react'

export default function SessionProposalModal() {
  const [selectedEIP155, setSelectedEip155] = useState<string[]>([])
  const [selectedCosmos, setSelectedCosmos] = useState<string[]>([])
  const [selectedSolana, setSelectedSolana] = useState<string[]>([])
  const allSelected = [...selectedEIP155, ...selectedCosmos, ...selectedSolana]

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

  // Add / remove address from Solana selection
  function onSelectSolana(address: string) {
    if (selectedSolana.includes(address)) {
      const newAddresses = selectedSolana.filter(a => a !== address)
      setSelectedSolana(newAddresses)
    } else {
      setSelectedSolana([...selectedSolana, address])
    }
  }

  // Hanlde approve action
  async function onApprove() {
    if (proposal) {
      const accounts = allSelected
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
              <ProposalSelectSection
                name={EIP155_CHAINS[chain as TEIP155Chain].name}
                addresses={eip155Addresses}
                selectedAddresses={selectedEIP155}
                onSelect={onSelectEIP155}
                chain={chain}
              />
            )
          } else if (isCosmosChain(chain)) {
            return (
              <ProposalSelectSection
                name={COSMOS_MAINNET_CHAINS[chain as TCosmosChain].name}
                addresses={cosmosAddresses}
                selectedAddresses={selectedCosmos}
                onSelect={onSelectCosmos}
                chain={chain}
              />
            )
          } else if (isSolanaChain(chain)) {
            return (
              <ProposalSelectSection
                name={SOLANA_MAINNET_CHAINS[chain as TSolanaChain].name}
                addresses={solanaAddresses}
                selectedAddresses={selectedSolana}
                onSelect={onSelectSolana}
                chain={chain}
              />
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
          disabled={!allSelected.length}
          css={{
            opacity: allSelected.length ? 1 : 0.4
          }}
        >
          Approve
        </Button>
      </Modal.Footer>
    </Fragment>
  )
}
