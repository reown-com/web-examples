import { Fragment, ReactNode, useMemo, useState } from 'react'
import { Divider, Text } from '@nextui-org/react'
import { CoreTypes } from '@walletconnect/types'

import ModalFooter from '@/components/ModalFooter'
import ProjectInfoCard from '@/components/ProjectInfoCard'
import RequestModalContainer from '@/components/RequestModalContainer'
import VerifyInfobox from '@/components/VerifyInfobox'
import { useSnapshot } from 'valtio'
import SettingsStore from '@/store/SettingsStore'
import ThreatPrompt from './TheatPrompt'

interface IProps {
  children: ReactNode
  metadata: CoreTypes.Metadata
  onApprove: () => void
  onReject: () => void
  intention?: string
  infoBoxCondition?: boolean
  infoBoxText?: string
  disabledApprove?: boolean
}
export default function RequestModal({
  children,
  metadata,
  onApprove,
  onReject,
  intention,
  infoBoxCondition,
  infoBoxText,
  disabledApprove
}: IProps) {
  const { currentRequestVerifyContext } = useSnapshot(SettingsStore.state)
  const isScam = currentRequestVerifyContext?.verified.isScam
  const [threatAcknowledged, setThreatAcknowledged] = useState(false)

  const threatPromptContent = useMemo(() => {
    return (
      <ThreatPrompt
        metadata={metadata}
        onApprove={() => setThreatAcknowledged(true)}
        onReject={onReject}
      />
    )
  }, [metadata, onReject])

  const modalContent = useMemo(() => {
    return (
      <>
        <RequestModalContainer title="">
          <ProjectInfoCard metadata={metadata} intention={intention} />
          <Divider y={1} />
          {children}
          <Divider y={1} />
          <VerifyInfobox metadata={metadata} />
        </RequestModalContainer>
        <ModalFooter
          onApprove={onApprove}
          onReject={onReject}
          infoBoxCondition={infoBoxCondition}
          infoBoxText={infoBoxText}
          disabledApprove={disabledApprove}
        />
      </>
    )
  }, [
    children,
    disabledApprove,
    infoBoxCondition,
    infoBoxText,
    intention,
    metadata,
    onApprove,
    onReject
  ])
  return <Fragment>{isScam && !threatAcknowledged ? threatPromptContent : modalContent}</Fragment>
}
