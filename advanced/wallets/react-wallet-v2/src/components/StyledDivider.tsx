import { Divider } from '@nextui-org/react'
import { ComponentProps } from 'react'

type DividerProps = ComponentProps<typeof Divider>

export default function StyledDivider({ css, ...props }: DividerProps) {
  return (
    <Divider
      css={{
        background: '$border',
        height: '1px',
        ...css
      }}
      {...props}
    />
  )
}
