import { supportedModules } from '@/data/ERC7579ModuleData'
import { isERC7579ModuleInstalled, installERC7579Module } from '@/utils/ERC7579AccountUtils'
import { styledToast } from '@/utils/HelperUtil'
import { Button, Card, Input, Loading, Row, Text, Textarea } from '@nextui-org/react'
import { Fragment, useCallback, useEffect, useState } from 'react'
import { Address, Chain } from 'viem'

export default function OwnableValidatorForm() {
  const [isLoading, setLoading] = useState(false)

  return (
    <Card css={{ marginBottom: '$5' }}>
      <Card.Body>
        <Input css={{ marginBottom: '$5' }} bordered placeholder="owner count" />
        <Input css={{ marginBottom: '$5' }} bordered placeholder="threshold" />
        <Textarea
          css={{ marginBottom: '$5' }}
          bordered
          label="Owner's addresses"
          placeholder="Enter comma separated addresses."
        />
        <Button auto>Install</Button>
      </Card.Body>
    </Card>
  )
}
