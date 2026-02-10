import { Modal } from '@nextui-org/react'
import { Fragment, useCallback, useState } from 'react'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CloseIcon from '@mui/icons-material/Close'
import {
  FormContainer,
  FormContinueButton,
  FormHeader,
  FormHeaderButton,
  FormInput,
  FormInputError,
  FormInputWrapper,
  FormProgressDot,
  FormProgressDots,
  FormTitle
} from './styles'
import { formatDateInput, FormStepConfig, isValidDate } from './utils'

interface CollectDataFormProps {
  formSteps: FormStepConfig[]
  formStep: number
  formData: Record<string, string>
  onFormChange: (fieldId: string, value: string, fieldType: string) => void
  onContinue: (results: Array<{ id: string; value: string }>) => void
  onBack: () => void
  onClose: () => void
}

export default function CollectDataForm({
  formSteps,
  formStep,
  formData,
  onFormChange,
  onContinue,
  onBack,
  onClose
}: CollectDataFormProps) {
  const [localFormStep, setLocalFormStep] = useState(formStep)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const currentStepConfig = formSteps[localFormStep]
  const totalProgressDots = Math.max(formSteps.length, 4)

  const handleFormChange = useCallback(
    (fieldId: string, value: string, fieldType: string) => {
      let formattedValue = value

      if (fieldType === 'date') {
        formattedValue = formatDateInput(value)
      }

      onFormChange(fieldId, formattedValue, fieldType)

      if (formErrors[fieldId]) {
        setFormErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors[fieldId]
          return newErrors
        })
      }
    },
    [formErrors, onFormChange]
  )

  const validateCurrentStep = useCallback((): boolean => {
    if (formSteps.length === 0) return true

    const stepConfig = formSteps[localFormStep]
    if (!stepConfig) return true

    const errors: Record<string, string> = {}

    for (const field of stepConfig.fields) {
      const value = formData[field.id]?.trim() || ''

      if (field.required && !value) {
        errors[field.id] = `${field.name} is required`
      } else if (value && field.fieldType === 'date' && !isValidDate(value)) {
        errors[field.id] = 'Please enter a valid date (YYYY-MM-DD)'
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }, [formSteps, localFormStep, formData])

  const handleContinue = useCallback(() => {
    if (!validateCurrentStep()) return

    if (localFormStep < formSteps.length - 1) {
      setLocalFormStep(prev => prev + 1)
      setFormErrors({})
    } else {
      const results = Object.entries(formData)
        .filter(([_, value]) => value.trim())
        .map(([id, value]) => ({ id, value: value.trim() }))

      onContinue(results)
    }
  }, [validateCurrentStep, localFormStep, formSteps.length, formData, onContinue])

  const handleBack = useCallback(() => {
    if (localFormStep > 0) {
      setLocalFormStep(prev => prev - 1)
      setFormErrors({})
    } else {
      onBack()
    }
  }, [localFormStep, onBack])

  return (
    <Fragment>
      <Modal.Body css={{ padding: 0 }}>
        <FormHeader>
          <FormHeaderButton onClick={handleBack}>
            <ArrowBackIcon sx={{ fontSize: 24, color: '#666' }} />
          </FormHeaderButton>
          <FormProgressDots>
            {Array.from({ length: totalProgressDots }).map((_, index) => (
              <FormProgressDot key={index} active={index <= localFormStep} />
            ))}
          </FormProgressDots>
          <FormHeaderButton onClick={onClose}>
            <CloseIcon sx={{ fontSize: 24, color: '#666' }} />
          </FormHeaderButton>
        </FormHeader>

        <FormContainer>
          <FormTitle>{currentStepConfig?.title || 'Additional information'}</FormTitle>

          {currentStepConfig?.fields.map(field => (
            <FormInputWrapper key={field.id}>
              <FormInput
                placeholder={field.name}
                value={formData[field.id] || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFormChange(field.id, e.target.value, field.fieldType)}
                maxLength={field.fieldType === 'date' ? 10 : undefined}
                hasError={!!formErrors[field.id]}
              />
              {formErrors[field.id] && <FormInputError>{formErrors[field.id]}</FormInputError>}
            </FormInputWrapper>
          ))}

          <FormContinueButton onClick={handleContinue}>Continue</FormContinueButton>
        </FormContainer>
      </Modal.Body>
    </Fragment>
  )
}
