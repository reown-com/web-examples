import { Input, styled } from '@nextui-org/react'
import { SyntheticEvent, useState } from 'react'

const StyledForm = styled('form', {
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  padding: '0.5rem',
  zIndex: 3
} as any)

const InputContainer = styled('div', {
  display: 'flex',
  justifyContent: 'center',
  flexDirection: 'row',
  position: 'sticky'
} as any)

const SendButton = styled('button', {
  // reset button styles
  background: 'transparent',
  border: 'none',
  padding: 0,
  // styles
  width: '24px',
  margin: '0 10px',
  dflex: 'center',
  bg: 'linear-gradient(90deg, $secondary, $primary)',
  borderRadius: '$rounded',
  cursor: 'pointer',
  transition: 'opacity 0.25s ease 0s, transform 0.25s ease 0s',
  svg: {
    size: '100%',
    padding: '4px',
    transition: 'transform 0.25s ease 0s, opacity 200ms ease-in-out 50ms',
    boxShadow: '0 5px 20px -5px rgba(0, 0, 0, 0.1)'
  },
  '&:hover': {
    opacity: 0.8
  },
  '&:active': {
    transform: 'scale(0.9)',
    svg: {
      transform: 'translate(24px, -24px)',
      opacity: 0
    }
  }
} as any)

const SendIcon = ({
  fill = 'currentColor',
  filled,
  size,
  height,
  width,
  label,
  className,
  ...props
}: any) => {
  return (
    <svg
      data-name="Iconly/Curved/Lock"
      xmlns="http://www.w3.org/2000/svg"
      width={size || width || 24}
      height={size || height || 24}
      viewBox="0 0 24 24"
      className={className}
      {...props}
    >
      <g transform="translate(2 2)">
        <path
          d="M19.435.582A1.933,1.933,0,0,0,17.5.079L1.408,4.76A1.919,1.919,0,0,0,.024,6.281a2.253,2.253,0,0,0,1,2.1L6.06,11.477a1.3,1.3,0,0,0,1.61-.193l5.763-5.8a.734.734,0,0,1,1.06,0,.763.763,0,0,1,0,1.067l-5.773,5.8a1.324,1.324,0,0,0-.193,1.619L11.6,19.054A1.91,1.91,0,0,0,13.263,20a2.078,2.078,0,0,0,.25-.01A1.95,1.95,0,0,0,15.144,18.6L19.916,2.525a1.964,1.964,0,0,0-.48-1.943"
          fill={fill}
        />
      </g>
    </svg>
  )
}

interface IProps {
  handleSend: (message: string) => void
}

export default function ChatboxInput({ handleSend }: IProps) {
  const [message, setMessage] = useState('')

  function handleMessageChange(evt: any) {
    setMessage(evt.target.value)
  }

  function onSend(evt: SyntheticEvent<HTMLButtonElement>) {
    evt.preventDefault()
    if (message.length > 0) {
      handleSend(message)
      // Clear the input post-send.
      setMessage('')
    }
  }

  return (
    <InputContainer>
      <StyledForm>
        <Input
          fullWidth
          rounded
          clearable
          bordered
          placeholder="Message..."
          aria-label="chatbox-input"
          value={message}
          onChange={handleMessageChange}
          contentRightStyling={false}
          contentRight={
            <SendButton type="submit" onClick={onSend}>
              <SendIcon />
            </SendButton>
          }
        />
      </StyledForm>
    </InputContainer>
  )
}
