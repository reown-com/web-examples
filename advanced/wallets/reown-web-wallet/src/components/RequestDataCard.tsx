import { Col, Row, Text } from '@nextui-org/react'
import { CodeBlock, codepen } from 'react-code-blocks'

/**
 * Types
 */
interface IProps {
  data: Record<string, unknown>
}

/**
 * Component
 */
export default function RequestDataCard({ data }: IProps) {
  return (
    <Row>
      <Col>
        <Text h5>Data</Text>
        <CodeBlock
          showLineNumbers={false}
          text={JSON.stringify(data, null, 2)}
          theme={codepen}
          language="json"
        />
      </Col>
    </Row>
  )
}
