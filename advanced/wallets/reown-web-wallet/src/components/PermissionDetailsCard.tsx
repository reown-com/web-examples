import { Col, Row, Text } from '@nextui-org/react'

type PermissionAction = {
  description: string
}

interface IProps {
  scope: PermissionAction[]
}

export default function PermissionDetailsCard({ scope }: IProps) {
  return (
    <Row>
      <Col>
        <Text h5>Dapp is requesting following permissions</Text>
        {scope.map((action, index) => {
          return (
            <Text color="$gray400" key={index}>
              {action.description}
            </Text>
          )
        })}
      </Col>
    </Row>
  )
}
