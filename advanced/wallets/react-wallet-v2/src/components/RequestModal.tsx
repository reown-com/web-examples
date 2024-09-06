import { Fragment, ReactNode, useEffect, useMemo, useState } from 'react'
import { Divider } from '@nextui-org/react'
import { CoreTypes } from '@walletconnect/types'
import ModalFooter, { LoaderProps } from '@/components/ModalFooter'
import ProjectInfoCard from '@/components/ProjectInfoCard'
import RequestModalContainer from '@/components/RequestModalContainer'
import VerifyInfobox from '@/components/VerifyInfobox'
import { useSnapshot } from 'valtio'
import SettingsStore from '@/store/SettingsStore'
import ThreatPrompt from '../views/TheatPrompt'

interface IProps {
  children: ReactNode
  metadata: CoreTypes.Metadata
  onApprove: () => void
  onReject: () => void
  intention?: string
  infoBoxCondition?: boolean
  infoBoxText?: string
  approveLoader?: LoaderProps
  rejectLoader?: LoaderProps
  disableApprove?: boolean
  disableReject?: boolean
  disableThreatDetection?: boolean
}
export default function RequestModal({
  children,
  metadata,
  onApprove,
  onReject,
  approveLoader,
  rejectLoader,
  intention,
  infoBoxCondition,
  infoBoxText,
  disableApprove,
  disableReject,
  disableThreatDetection
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
          {disableThreatDetection === undefined ? <VerifyInfobox metadata={metadata} /> : null}
        </RequestModalContainer>
        <ModalFooter
          onApprove={onApprove}
          onReject={onReject}
          approveLoader={approveLoader}
          rejectLoader={rejectLoader}
          infoBoxCondition={infoBoxCondition}
          infoBoxText={infoBoxText}
          disableApprove={disableApprove}
          disableReject={disableReject}
        />
      </>
    )
  }, [
    approveLoader,
    children,
    infoBoxCondition,
    infoBoxText,
    intention,
    metadata,
    onApprove,
    onReject,
    rejectLoader,
    disableApprove,
    disableReject
  ])
  return <Fragment>{isScam && !threatAcknowledged ? threatPromptContent : modalContent}</Fragment>
}
