import { Avatar, styled } from '@nextui-org/react'

const ChatAvatar = styled(Avatar, {
  '> span': {
    background:
      'radial-gradient(75.29% 75.29% at 64.96% 24.36%, #FFFFFF 0.52%, #F5CCFC 31.25%, #DBA4F5 51.56%, #9A8EE8 65.62%, #6493DA 82.29%, #6EBDEA 100%) !important'
  }
} as any)

export default ChatAvatar
