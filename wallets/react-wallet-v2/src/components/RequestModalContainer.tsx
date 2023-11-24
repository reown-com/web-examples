import { Container, Modal, Text } from '@nextui-org/react'
import { Fragment, ReactNode } from 'react'

/**
 * Types
 */
interface IProps {
  title?: string
  children: ReactNode | ReactNode[]
}

/**
 * Component
 */
export default function RequestModalContainer({ children, title }: IProps) {
  return (
    <Fragment>
      {title ? (
        <Modal.Header>
          <Text h3>{title}</Text>
        </Modal.Header>
      ) : null}
      <Modal.Body>
        <Container css={{ padding: 0 }}>{children}</Container>
      </Modal.Body>
    </Fragment>
  )
}
