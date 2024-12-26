import { Row } from '@nextui-org/react'

interface Props {
  address?: string
}

export default function ChainAddressMini({ address }: Props) {
  if (!address || address === 'N/A') return <></>
  return (
    <>
      <Row>
        <span style={{ marginLeft: '5px' }}>
          {address.substring(0, 6)}...{address.substring(address.length - 6)}
        </span>
      </Row>
    </>
  )
}
