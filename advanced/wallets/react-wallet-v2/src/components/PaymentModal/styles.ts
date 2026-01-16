import { Avatar, styled } from '@nextui-org/react'

export const StyledOptionCard = styled('div', {
  padding: '16px',
  borderRadius: '12px',
  border: '2px solid transparent',
  backgroundColor: 'rgba(139, 139, 139, 0.1)',
  cursor: 'pointer',
  marginBottom: '8px',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: 'rgba(139, 139, 139, 0.2)'
  },
  variants: {
    selected: {
      true: {
        borderColor: '$primary',
        backgroundColor: 'rgba(23, 200, 100, 0.1)'
      }
    }
  }
})

export const StyledTokenIcon = styled('img', {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  objectFit: 'cover'
})

export const StyledMerchantIcon = styled(Avatar, {
  border: '2px solid rgba(139, 139, 139, 0.4)'
})

export const StyledFormField = styled('div', {
  marginBottom: '16px'
})

// Intro screen styled components
export const IntroContainer = styled('div', {
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center'
})

export const IntroCloseButton = styled('button', {
  position: 'absolute',
  top: '16px',
  right: '16px',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '8px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background-color 0.2s',
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.05)'
  }
})

export const IntroMerchantLogo = styled('div', {
  width: '64px',
  height: '64px',
  borderRadius: '16px',
  backgroundColor: '#000',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  marginBottom: '16px',
  '& img': {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  }
})

export const IntroTitle = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  marginBottom: '32px',
  textAlign: 'center',
  width: '100%'
})

export const IntroTimeline = styled('div', {
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: '0',
  marginBottom: '32px'
})

export const IntroTimelineStep = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  position: 'relative'
})

export const IntroTimelineIndicator = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  width: '12px',
  alignSelf: 'stretch'
})

export const IntroTimelineCircle = styled('div', {
  width: '12px',
  height: '12px',
  borderRadius: '50%',
  border: '2px solid #E5E5E5',
  backgroundColor: 'white',
  zIndex: 1,
  flexShrink: 0
})

export const IntroTimelineLine = styled('div', {
  position: 'absolute',
  width: '2px',
  top: '50%',
  bottom: '-12px',
  left: '50%',
  transform: 'translateX(-50%)',
  backgroundColor: '#E5E5E5'
})

export const IntroTimelineContent = styled('div', {
  flex: 1,
  paddingBottom: '24px'
})

export const IntroTimelineHeader = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '0'
})

export const IntroTimelineBadge = styled('span', {
  fontSize: '12px',
  color: '#888',
  backgroundColor: 'rgba(128, 128, 128, 0.15)',
  padding: '4px 8px',
  borderRadius: '4px'
})

export const IntroStartButton = styled('button', {
  width: '100%',
  padding: '16px',
  backgroundColor: '#0094FF',
  color: 'white',
  border: 'none',
  borderRadius: '16px',
  fontSize: '16px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
  '&:hover': {
    backgroundColor: '#0080E0'
  }
})

// Form screen styled components
export const FormContainer = styled('div', {
  padding: '0 24px 24px 24px',
  display: 'flex',
  flexDirection: 'column'
})

export const FormHeader = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 16px 8px 16px'
})

export const FormHeaderButton = styled('button', {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '8px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background-color 0.2s',
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.05)'
  }
})

export const FormProgressDots = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '8px'
})

export const FormProgressDot = styled('div', {
  height: '4px',
  borderRadius: '2px',
  transition: 'all 0.2s',
  variants: {
    active: {
      true: {
        width: '24px',
        backgroundColor: '#0094FF'
      },
      false: {
        width: '24px',
        backgroundColor: '#E5E5E5'
      }
    }
  },
  defaultVariants: {
    active: false
  }
})

export const FormTitle = styled('h2', {
  fontSize: '20px',
  fontWeight: '600',
  textAlign: 'center',
  margin: '16px 0 24px 0',
  color: '$text'
})

export const FormInputWrapper = styled('div', {
  marginBottom: '12px'
})

export const FormInput = styled('input', {
  width: '100%',
  padding: '16px',
  fontSize: '16px',
  border: '2px solid #E5E5E5',
  borderRadius: '12px',
  outline: 'none',
  transition: 'border-color 0.2s',
  backgroundColor: 'transparent',
  color: '$text',
  boxSizing: 'border-box',
  '&:focus': {
    borderColor: '#0094FF'
  },
  '&::placeholder': {
    color: '#999'
  },
  variants: {
    hasError: {
      true: {
        borderColor: '#F31260'
      }
    }
  }
})

export const FormInputError = styled('span', {
  fontSize: '12px',
  color: '#F31260',
  marginTop: '4px',
  display: 'block'
})

export const FormContinueButton = styled('button', {
  width: '100%',
  padding: '16px',
  backgroundColor: '#0094FF',
  color: 'white',
  border: 'none',
  borderRadius: '16px',
  fontSize: '16px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
  marginTop: '12px',
  '&:hover': {
    backgroundColor: '#0080E0'
  },
  '&:disabled': {
    backgroundColor: '#ccc',
    cursor: 'not-allowed'
  }
})

// Payment info screen styled components
export const PaymentInfoContainer = styled('div', {
  padding: '0 24px 24px 24px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center'
})

export const PaymentInfoMerchantLogo = styled('div', {
  width: '72px',
  height: '72px',
  borderRadius: '20px',
  backgroundColor: '#000',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  marginBottom: '16px',
  '& img': {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  }
})

export const PaymentInfoTitle = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  marginBottom: '24px',
  textAlign: 'center',
  width: '100%'
})

export const PaymentInfoRow = styled('div', {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px',
  borderRadius: '12px',
  border: '1px solid #E5E5E5',
  marginBottom: '12px'
})

export const PaymentInfoLabel = styled('span', {
  fontSize: '16px',
  color: '#666'
})

export const PaymentInfoValue = styled('span', {
  fontSize: '16px',
  fontWeight: '600',
  color: '$text'
})

export const PaymentMethodSelector = styled('button', {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '0'
})

export const PaymentMethodIcon = styled('img', {
  width: '24px',
  height: '24px',
  borderRadius: '50%'
})

export const PaymentMethodDropdown = styled('div', {
  position: 'absolute',
  top: '100%',
  right: '0',
  marginTop: '8px',
  backgroundColor: '#2a2a2a',
  borderRadius: '12px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
  zIndex: 100,
  minWidth: '200px',
  maxHeight: '300px',
  overflowY: 'auto'
})

export const PaymentMethodOption = styled('button', {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px 16px',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.1)'
  },
  '&:first-child': {
    borderTopLeftRadius: '12px',
    borderTopRightRadius: '12px'
  },
  '&:last-child': {
    borderBottomLeftRadius: '12px',
    borderBottomRightRadius: '12px'
  }
})

export const PayButton = styled('button', {
  width: '100%',
  padding: '16px',
  backgroundColor: '#0094FF',
  color: 'white',
  border: 'none',
  borderRadius: '16px',
  fontSize: '16px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
  marginTop: '12px',
  '&:hover': {
    backgroundColor: '#0080E0'
  },
  '&:disabled': {
    backgroundColor: '#ccc',
    cursor: 'not-allowed'
  }
})
