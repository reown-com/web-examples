import { Button, Card, Col, CSS, Row, Text } from '@nextui-org/react'
import { MouseEventHandler, ReactNode } from 'react'
import ChatAvatar from './ChatAvatar'
import { truncate } from '@/utils/HelperUtil'
import { FiCheck, FiX } from 'react-icons/fi'
import { demoAddressResolver } from '@/config/chatConstants'

/**
 * Types
 */
interface IProps {
  account: string
  message: string
  onAccept: MouseEventHandler<any>
  onReject: MouseEventHandler<any>
}

const RequestActionButton = ({
  onClick,
  icon,
  css
}: {
  onClick: MouseEventHandler<HTMLButtonElement>
  icon: ReactNode
  css?: CSS
}) => (
  <Button
    auto
    rounded
    size="xs"
    icon={icon}
    onClick={onClick}
    css={{
      fontSize: '$xs',
      fontWeight: '$extrabold',
      color: 'black',
      borderRadius: '100%',
      margin: '0 $2',
      padding: '5px',
      ...css
    }}
  />
)

/**
 * Component
 */
export default function ChatRequestCard({ account, message, onAccept, onReject }: IProps) {
  const formattedAccount = demoAddressResolver[account] ?? account
  return (
    <Card
      bordered
      borderWeight="light"
      css={{
        position: 'relative',
        marginBottom: '$6',
        minHeight: '70px'
      }}
    >
      <Card.Body
        css={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          overflow: 'hidden'
        }}
      >
        <ChatAvatar />
        <Col>
          <Text h5 css={{ marginLeft: '$9' }}>
            {truncate(formattedAccount, 20)}
          </Text>
          <Text h6 weight="normal" css={{ marginLeft: '$9' }}>
            {message}
          </Text>
        </Col>
        <Row justify="flex-end">
          <RequestActionButton
            onClick={onAccept}
            icon={<FiCheck />}
            css={{
              background: '$chatGreenPrimary'
            }}
          />
          <RequestActionButton onClick={onReject} icon={<FiX />} css={{ background: '#FF453A' }} />
        </Row>
      </Card.Body>
    </Card>
  )
}
