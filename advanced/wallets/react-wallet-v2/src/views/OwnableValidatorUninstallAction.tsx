import { Button, Collapse, Loading, Row, Text } from '@nextui-org/react'
import { useState } from 'react'

export default function OwnableValidatorUninstallActions({
  accountAddress,
  chainId
}: {
  accountAddress: string
  chainId: string
}) {
  const [isUninstalling, setUninstalling] = useState(false)

  const uninstall = async () => {
    setUninstalling(true)
    setUninstalling(false)
  }

  return (
    <Collapse css={{ marginBottom: '$2' }} bordered title={<Text h5>Uninstall</Text>}>
      <Row justify="space-between" align="center">
        <Text>Coming soon...</Text>
        <Button auto color={'error'} disabled onClick={uninstall}>
          {isUninstalling ? <Loading type="points" color="currentColor" size="sm" /> : 'Uninstall'}
        </Button>
      </Row>
    </Collapse>
  )
}
