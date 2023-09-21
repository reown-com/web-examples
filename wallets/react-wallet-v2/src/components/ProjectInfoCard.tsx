import { useMemo } from 'react'
import { useSnapshot } from 'valtio'
import { Image } from '@nextui-org/react'
import SettingsStore from '@/store/SettingsStore'
// import VerifiedIcon from '/../../public/icons/verified-icon.svg'
import ReportIcon from '@mui/icons-material/Report'
import ReportProblemIcon from '@mui/icons-material/ReportProblem'
import { Avatar, Col, Link, Row, Text, styled } from '@nextui-org/react'
import { SignClientTypes } from '@walletconnect/types'

/**
 * Types
 */
interface IProps {
  metadata: SignClientTypes.Metadata
  intention?: string
}

const StyledLink = styled('span', {
  color: '#697177'
} as any)

const StyledVerifiedIcon = styled('img', {
  verticalAlign: 'middle',
  marginRight: '5px'
} as any)

const StyledUnknownRow = styled(Row, {
  color: '$warning'
  // marginTop: '10px'
} as any)

const StyledUnknownContainer = styled('div', {
  padding: '7px'
} as any)

const StyledInvalidRow = styled(Row, {
  color: '$error'
  // marginTop: '10px'
} as any)

const StyledInvalidContainer = styled('div', {
  padding: '7px'
} as any)

/**
 * Components
 */
export default function ProjectInfoCard({ metadata, intention }: IProps) {
  const { currentRequestVerifyContext } = useSnapshot(SettingsStore.state)
  const validation = currentRequestVerifyContext?.verified.validation
  const { icons, name, url } = metadata
  const validationDescriptionShort = useMemo(() => {
    if (!currentRequestVerifyContext?.verified.validation) return ''
    switch (currentRequestVerifyContext?.verified.validation) {
      case 'INVALID':
        return 'Invalid Domain'
      case 'UNKNOWN':
        return 'Cannot Verify'
    }
  }, [currentRequestVerifyContext])
  return (
    <div style={{ textAlign: 'center' }}>
      <Row>
        <Col>
          <Avatar style={{ margin: 'auto' }} src={icons[0]} size={'xl'} />
        </Col>
      </Row>
      <Row align="center">
        <Col>
          <Text h3 data-testid="session-info-card-text">
            <span>{name}</span> <br />
            <Text h4> wants to {intention ? intention : 'connect'}</Text>
          </Text>
        </Col>
      </Row>
      <Row align="center">
        <Col>
          {validation == 'VALID' ? <StyledVerifiedIcon src="/icons/verified-domain.svg" /> : null}
          <Link style={{ verticalAlign: 'middle' }} href={url} data-testid="session-info-card-url">
            <StyledLink>{url}</StyledLink>
          </Link>
        </Col>
      </Row>
      {validation == 'UNKNOWN' ? (
        <StyledUnknownRow>
          <Col style={{ margin: 'auto' }}>
            <StyledUnknownContainer>
              <ReportIcon style={{ verticalAlign: 'bottom' }} />
              {validationDescriptionShort}
            </StyledUnknownContainer>
          </Col>
        </StyledUnknownRow>
      ) : null}
      {validation == 'INVALID' ? (
        <StyledInvalidRow>
          <Col style={{ margin: 'auto' }}>
            <StyledInvalidContainer>
              <ReportProblemIcon style={{ verticalAlign: 'bottom', marginRight: '2px' }} />
              {validationDescriptionShort}
            </StyledInvalidContainer>
          </Col>
        </StyledInvalidRow>
      ) : null}
    </div>
  )
}
