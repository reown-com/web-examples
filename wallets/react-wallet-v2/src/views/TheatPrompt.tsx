import { Fragment, ReactNode, useMemo } from 'react'
import { Col, Divider, Link, Row, Text, styled } from '@nextui-org/react'
import { CoreTypes } from '@walletconnect/types'
import NewReleasesIcon from '@mui/icons-material/NewReleases'

import ModalFooter from '@/components/ModalFooter'
import ProjectInfoCard from '@/components/ProjectInfoCard'
import RequestModalContainer from '@/components/RequestModalContainer'
import VerifyInfobox from '@/components/VerifyInfobox'
import { useSnapshot } from 'valtio'
import SettingsStore from '@/store/SettingsStore'

interface IProps {
  metadata: CoreTypes.Metadata
  onApprove: () => void
  onReject: () => void
}

const StyledLink = styled('span', {
  color: '#697177'
} as any)

const StyledProceedButton = styled('p', {
  margin: '10px auto',
  padding: '10px',
  color: '$error',
  cursor: 'pointer'
} as any)

const StyledCloseButton = styled('p', {
  margin: 'auto',
  padding: '10px',
  border: '1px solid $error',
  borderRadius: '30px'
} as any)

export default function ThreatPrompt({ metadata, onApprove, onReject }: IProps) {
  const { icons, name, url } = metadata

  return (
    <RequestModalContainer title="">
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <Row>
          <Col>
            <NewReleasesIcon sx={{ fontSize: '55px', color: '$error' }} color="error" />
          </Col>
        </Row>
        <Row align="center">
          <Col>
            <Text h3>Website flagged</Text>
          </Col>
        </Row>
        <Row align="center">
          <Col>
            <Link
              style={{ verticalAlign: 'middle' }}
              href={url}
              data-testid="session-info-card-url"
            >
              <StyledLink>{url}</StyledLink>
            </Link>
          </Col>
        </Row>
        <div style={{ textAlign: 'center' }}>
          <Divider y={1} />
          <Text>
            This website you`re trying to connect is flagged as malicious by multiple security
            providers. Approving may lead to loss of funds.
          </Text>
          <Row>
            <StyledProceedButton color="$error" onClick={onApprove}>
              Proceed anyway
            </StyledProceedButton>
          </Row>
          <Row>
            <Col span={10} style={{ margin: 'auto', cursor: 'pointer' }} onClick={onReject}>
              <StyledCloseButton>Close</StyledCloseButton>
            </Col>
          </Row>
        </div>
      </div>
    </RequestModalContainer>
  )
}
