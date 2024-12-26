import { Col, Grid, Row, Text, styled } from '@nextui-org/react'
import { useCallback, useMemo, useState, useEffect } from 'react'
import { buildApprovedNamespaces, getSdkError } from '@walletconnect/utils'
import { SignClientTypes } from '@walletconnect/types'
import DoneIcon from '@mui/icons-material/Done'
import CloseIcon from '@mui/icons-material/Close'
import ModalStore from '@/store/ModalStore'
import { styledToast } from '@/utils/HelperUtil'
import { walletKit } from '@/utils/WalletConnectUtil'
import { EIP155Chain, EIP155_CHAINS, EIP155_SIGNING_METHODS } from '@/data/EIP155Data'
import ChainDataMini from '@/components/ChainDataMini'
import ChainAddressMini from '@/components/ChainAddressMini'
import { getChainData } from '@/data/chainsUtil'
import RequestModal from './RequestModal'
import { useSnapshot } from 'valtio'
import SettingsStore from '@/store/SettingsStore'
import { EIP5792_METHODS } from '@/data/EIP5792Data'
import { ChainController, useAppKitAccount, useAppKitProvider, useAppKitState } from '@reown/appkit/react'
import { W3mFrameProvider } from '@reown/appkit-wallet'
import LoadingModal from './LoadingModal'
import { useRouter } from 'next/router'

const StyledText = styled(Text, {
  fontWeight: 400
} as any)

const StyledSpan = styled('span', {
  fontWeight: 400
} as any)

export default function SessionProposalModal() {
  // Get proposal data and wallet address from store
  const data = useSnapshot(ModalStore.state)
  const proposal = data?.data?.proposal as SignClientTypes.EventArguments['session_proposal']
  const [isLoadingApprove, setIsLoadingApprove] = useState(false)
  const [isLoadingReject, setIsLoadingReject] = useState(false)
  const { address, caipAddress } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider<W3mFrameProvider>('eip155')

  const [supportedNamespaces, setSupportedNamespaces] = useState<any>(null)
  const [smartAccounts, setSmartAccounts] = useState<string[]>([])
  const [activeChainId, setActiveChainId] = useState<string>('')
  const [email, setEmail] = useState<string>('')

  useEffect(() => {
    if (!walletProvider)
      return;

    const fetchSupportedNamespaces = async () => {
      console.log('fetchSupportedNamespaces', walletProvider)

      const user = await walletProvider.getUser({})

      const saAddress = user.accounts?.find(account => account.type === 'smartAccount')?.address
      const eoaAddress = user.accounts?.find(account => account.type === 'eoa')?.address

      const activeChainId = `eip155:${user.chainId}`

      // eip155
      const eip155Chains = Object.keys(EIP155_CHAINS)
      const eip155Methods = Object.values(EIP155_SIGNING_METHODS)

      // eip5792
      const eip5792Chains = Object.keys(EIP155_CHAINS)
      const eip5792Methods = Object.values(EIP5792_METHODS)

      const smartAccounts = eip155Chains.map(chain => `${chain}:${saAddress}`)
      const eoaAccounts = eip155Chains.map(chain => `${chain}:${eoaAddress}`)
      
      let allAccounts = [...smartAccounts, ...eoaAccounts];
      
      // Move preferred account type for active chain to the front
      const preferredAccountType = user.preferredAccountType
      const preferredAccountAddress = preferredAccountType === 'smartAccount' ? saAddress : eoaAddress
      const preferredAccountForActiveChain = `${activeChainId}:${preferredAccountAddress}`
      
      allAccounts = [
        preferredAccountForActiveChain,
        ...allAccounts.filter(account => account !== preferredAccountForActiveChain)
      ];

      console.log('allAccounts', allAccounts)

      const result = {
        eip155: {
          chains: eip155Chains,
          methods: eip155Methods.concat(eip5792Methods),
          events: ['accountsChanged', 'chainChanged'],
          accounts: allAccounts,
        },
      };

      setActiveChainId(activeChainId);
      setEmail(user.email || '')
      setSmartAccounts(smartAccounts);
      setSupportedNamespaces(result);
    };

    fetchSupportedNamespaces();
  }, [walletProvider]);

  const requestedChains = useMemo(() => {
    if (!proposal) return []
    const required = []
    for (const [key, values] of Object.entries(proposal.params.requiredNamespaces)) {
      const chains = key.includes(':') ? key : values.chains
      required.push(chains)
    }

    const optional = []
    for (const [key, values] of Object.entries(proposal.params.optionalNamespaces)) {
      const chains = key.includes(':') ? key : values.chains
      optional.push(chains)
    }

    return [...new Set([...required.flat(), ...optional.flat()])]
  }, [proposal])

  // the chains that are supported by the wallet from the proposal
  const supportedChains: EIP155Chain[] = useMemo(
    () =>
      requestedChains
        .map(chain => {
          const chainData = getChainData(chain!)

          if (!chainData) return null

          return chainData
        })
        .filter(chain => chain), // removes null values
    [requestedChains]
  ) as unknown as EIP155Chain[]

  // get required chains that are not supported by the wallet
  const notSupportedChains = useMemo(() => {
    if (!proposal) return []
    const required = []
    for (const [key, values] of Object.entries(proposal.params.requiredNamespaces)) {
      const chains = key.includes(':') ? key : values.chains
      required.push(chains)
    }
    return required
      .flat()
      .filter(
        chain =>
          !supportedChains
            .map(supportedChain => `${supportedChain?.namespace}:${supportedChain?.chainId}`)
            .includes(chain!)
      )
  }, [proposal, supportedChains])
  const getAddress = useCallback((namespace?: string) => {
    if (!namespace) return 'N/A'
    switch (namespace) {
      case 'eip155':
        return address
    }
  }, [address])

  const namespaces = useMemo(() => {
    try {
      // the builder throws an exception if required namespaces are not supported
      return buildApprovedNamespaces({
        proposal: proposal.params,
        supportedNamespaces
      })
    } catch (e) {}
  }, [proposal.params, supportedNamespaces])


  // Hanlde approve action, construct session namespace
  const onApprove = useCallback(async () => {
    if (proposal && namespaces) {
      setIsLoadingApprove(true)
      try {
        const session = await walletKit.approveSession({
          id: proposal.id,
          namespaces,
          sessionProperties: {
            "smartAccounts": JSON.stringify(smartAccounts),
            "email": email,
          }
        })
        SettingsStore.setSessions(Object.values(walletKit.getActiveSessions()))

        await new Promise(resolve => setTimeout(resolve, 1000))
      
        const chainChanged = {
          topic: session.topic,
          event: {
            name: 'chainChanged',
            data: `0x${parseInt(activeChainId.split(':')[1]).toString(16)}`
          },
          chainId: activeChainId
        }
  
        console.log('chainChanged', chainChanged)
        await walletKit.emitSessionEvent(chainChanged)

        const nativeRedirect = session.peer.metadata.redirect?.native
        if (nativeRedirect) {
          // Try to open the native app using the URL schema
          window.location.assign(nativeRedirect)
        }
      } catch (e) {
        setIsLoadingApprove(false)
        styledToast((e as Error).message, 'error')
        return
      }
    }
    setIsLoadingApprove(false)
    ModalStore.close()
  }, [namespaces, proposal, walletProvider])

  // Hanlde reject action
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const onReject = useCallback(async () => {
    if (proposal) {
      try {
        setIsLoadingReject(true)
        await new Promise(resolve => setTimeout(resolve, 1000))
        await walletKit.rejectSession({
          id: proposal.id,
          reason: getSdkError('USER_REJECTED_METHODS')
        })
      } catch (e) {
        setIsLoadingReject(false)
        styledToast((e as Error).message, 'error')
        return
      }
    }
    setIsLoadingReject(false)
    ModalStore.close()
  }, [proposal])

  return (
    <RequestModal
      metadata={proposal.params.proposer.metadata}
      onApprove={onApprove}
      onReject={onReject}
      approveLoader={{ active: isLoadingApprove }}
      rejectLoader={{ active: isLoadingReject }}
      infoBoxCondition={notSupportedChains.length > 0 || supportedChains.length === 0}
      disableApprove={notSupportedChains.length > 0 || supportedChains.length === 0}
      infoBoxText={`The session cannot be approved because the wallet does not the support some or all of the proposed chains. Please inspect the console for more information.`}
    >
      <Row>
        <Col>
          <StyledText h4>Requested permissions</StyledText>
        </Col>
      </Row>
      <Row>
        <Col>
          <DoneIcon style={{ verticalAlign: 'bottom' }} />{' '}
          <StyledSpan>View your balance and activity</StyledSpan>
        </Col>
      </Row>
      <Row>
        <Col>
          <DoneIcon style={{ verticalAlign: 'bottom' }} />{' '}
          <StyledSpan>Send approval requests</StyledSpan>
        </Col>
      </Row>
      <Row>
        <Col style={{ color: 'gray' }}>
          <CloseIcon style={{ verticalAlign: 'bottom' }} />
          <StyledSpan>Move funds without permission</StyledSpan>
        </Col>
      </Row>
      <Grid.Container style={{ marginBottom: '10px', marginTop: '10px' }} justify={'space-between'}>
        <Grid>
          <Row style={{ color: 'GrayText' }}>Accounts</Row>
          {(supportedChains.length > 0 &&
            supportedChains.map((chain, i) => {
              return (
                <Row key={i}>
                  <ChainAddressMini key={i} address={getAddress(chain?.namespace) || 'test'} />
                </Row>
              )
            })) || <Row>Non available</Row>}

          <Row style={{ color: 'GrayText' }}>Smart Accounts</Row>
        </Grid>
        <Grid>
          <Row style={{ color: 'GrayText' }} justify="flex-end">
            Chains
          </Row>
          {(supportedChains.length > 0 &&
            supportedChains.map((chain, i) => {
              if (!chain) {
                return <></>
              }

              return (
                <Row key={i}>
                  <ChainDataMini key={i} chainId={`${chain?.namespace}:${chain?.chainId}`} />
                </Row>
              )
            })) || <Row>Non available</Row>}
          <Row style={{ color: 'GrayText' }} justify="flex-end">
            Chains
          </Row>
        </Grid>
      </Grid.Container>
    </RequestModal>
  )
}
