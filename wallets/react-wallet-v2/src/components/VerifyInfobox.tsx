import { useMemo } from 'react'
import { useSnapshot } from 'valtio'
import { Image, StyledText } from '@nextui-org/react'
import SettingsStore from '@/store/SettingsStore'
import ReportIcon from '@mui/icons-material/Report'
import ReportProblemIcon from '@mui/icons-material/ReportProblem'
import NewReleasesIcon from '@mui/icons-material/NewReleases'
import { Avatar, Col, Link, Row, Text, styled } from '@nextui-org/react'
import { SignClientTypes } from '@walletconnect/types'

/**
 * Types
 */
interface IProps {
  metadata: SignClientTypes.Metadata
}

const StyledContainer = styled(Row, {
  padding: '7px',
  borderRadius: '30px',
  marginTop: '10px',
  marginBottom: '10px'
} as any)

const StyledUnknownRow = styled(StyledContainer, {
  color: '$warning',
  border: '0.5px solid $warning'
} as any)

const StyledUnknownContainer = styled('div', {
  textAlign: 'initial'
} as any)

const StyledInvalidRow = styled(StyledContainer, {
  color: '$error',
  border: '0.5px solid $error'
} as any)

const StyledInvalidContainer = styled('div', {
  textAlign: 'initial'
} as any)

const StyledDescription = styled(Text, {
  lineHeight: '20px',
  fontSize: '15px'
} as any)
/**
 * Components
 */
export default function VerifyInfobox({ metadata }: IProps) {
  const { currentRequestVerifyContext } = useSnapshot(SettingsStore.state)
  const validation = currentRequestVerifyContext?.verified.validation
  return (
    <div style={{ textAlign: 'center' }}>
      {currentRequestVerifyContext?.verified.isScam ? (
        <StyledInvalidRow>
          <Col style={{ margin: 'auto' }} span={2}>
            <NewReleasesIcon style={{ verticalAlign: 'bottom' }} />
          </Col>
          <Col style={{ margin: 'auto' }}>
            <Row>Known secury risk</Row>
            <Row>
              <StyledInvalidContainer>
                <StyledDescription>
                  This website is flagged as unsafe by multiple security reports. Leave immediately
                  to protect your assets.
                </StyledDescription>
              </StyledInvalidContainer>
            </Row>
          </Col>
        </StyledInvalidRow>
      ) : validation == 'UNKNOWN' ? (
        <StyledUnknownRow>
          <Col style={{ margin: 'auto' }} span={2}>
            <ReportIcon style={{ verticalAlign: 'bottom' }} />
          </Col>
          <Col style={{ margin: 'auto' }}>
            <Row>
              <StyledUnknownContainer>Unknown domain</StyledUnknownContainer>
            </Row>
            <Row>
              <StyledUnknownContainer>
                <StyledDescription>
                  This domain cannot be verified. Please check the request carefully before
                  approving.
                </StyledDescription>
              </StyledUnknownContainer>
            </Row>
          </Col>
        </StyledUnknownRow>
      ) : validation == 'INVALID' ? (
        <StyledInvalidRow>
          <Col style={{ margin: 'auto' }} span={2}>
            <ReportProblemIcon style={{ verticalAlign: 'bottom' }} />
          </Col>
          <Col style={{ margin: 'auto' }}>
            <Row>
              <>Domain mismatch</>
            </Row>
            <Row>
              <StyledInvalidContainer>
                <StyledDescription>
                  This website has a domain that does not match the sender of this request.
                  Approving may lead to loss of funds.
                </StyledDescription>
              </StyledInvalidContainer>
            </Row>
          </Col>
        </StyledInvalidRow>
      ) : null}
    </div>
  )
}
