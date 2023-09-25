import { Button } from '@nextui-org/react'
import { MouseEventHandler, ReactNode } from 'react'

interface IProps {
  onClick: MouseEventHandler<HTMLButtonElement>
  icon: ReactNode
}

export default function ChatPrimaryCTAButton({ onClick, icon }: IProps) {
  return (
    <Button
      auto
      rounded
      icon={icon}
      onClick={onClick}
      css={{
        background: '$chatGreenPrimary',
        fontSize: '$md',
        borderRadius: '100%',
        padding: '8px'
      }}
    />
  )
}
