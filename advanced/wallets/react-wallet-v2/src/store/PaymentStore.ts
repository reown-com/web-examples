import { proxy, ref } from 'valtio'
import type {
  PaymentOptionsResponse,
  PaymentOption,
} from '@walletconnect/pay'

import { walletkit } from '@/utils/WalletConnectUtil'
import { eip155Wallets } from '@/utils/EIP155WalletUtil'
import SettingsStore from '@/store/SettingsStore'
import {
  detectErrorType,
  getErrorMessage,
  formatAmount,
} from '@/components/PaymentModal/utils'
import type { ErrorType, Step } from '@/components/PaymentModal/utils'

interface PaymentState {
  paymentOptions: PaymentOptionsResponse | null
  loadingMessage: string | null
  errorMessage: string | null
  step: Step

  resultStatus: 'success' | 'error'
  resultMessage: string
  resultErrorType: ErrorType | null

  selectedOption: PaymentOption | null
  paymentActions: any[] | null
  isLoadingActions: boolean
  actionsError: string | null

  collectDataCompletedIds: string[]
}

const initialState: PaymentState = {
  paymentOptions: null,
  loadingMessage: null,
  errorMessage: null,
  step: 'loading',
  resultStatus: 'success',
  resultMessage: '',
  resultErrorType: null,

  selectedOption: null,
  paymentActions: null,
  isLoadingActions: false,
  actionsError: null,
  collectDataCompletedIds: [],
}

const state = proxy<PaymentState>({ ...initialState })

const PaymentStore = {
  state,

  startPayment(params: {
    paymentOptions?: PaymentOptionsResponse
    loadingMessage?: string
    errorMessage?: string
  }) {
    Object.assign(state, { ...initialState })

    if (params.paymentOptions) {
      state.paymentOptions = ref(params.paymentOptions)
    }
    state.loadingMessage = params.loadingMessage ?? null
    state.errorMessage = params.errorMessage ?? null
  },

  setPaymentOptions(options: PaymentOptionsResponse) {
    console.log('[PaymentStore] setPaymentOptions:', {
      paymentId: options.paymentId,
      optionsCount: options.options?.length,
      optionsWithCollectData: options.options?.map(o => ({
        id: o.id,
        hasCollectDataUrl: !!o.collectData?.url,
      })),
    })
    state.paymentOptions = ref(options)
    state.loadingMessage = null
    state.errorMessage = null
    state.resultErrorType = null
  },

  setError(errorMessage: string) {
    const errorType = detectErrorType(errorMessage)
    state.errorMessage = errorMessage
    state.loadingMessage = null
    state.resultStatus = 'error'
    state.resultMessage = getErrorMessage(errorType, errorMessage)
    state.resultErrorType = errorType
    state.step = 'result'
  },

  reset() {
    Object.assign(state, { ...initialState })
  },

  setStep(step: Step) {
    state.step = step
  },

  setResult(payload: {
    status: 'success' | 'error'
    message: string
    errorType?: ErrorType
  }) {
    state.resultStatus = payload.status
    state.resultMessage = payload.message
    state.resultErrorType = payload.errorType ?? null
    state.errorMessage = null
    state.loadingMessage = null
    state.step = 'result'
  },

  selectOption(option: PaymentOption) {
    state.selectedOption = ref(option)
  },

  clearSelectedOption() {
    state.selectedOption = null
    state.paymentActions = null
    state.actionsError = null
  },

  markCollectDataCompleted(optionId: string) {
    if (!state.collectDataCompletedIds.includes(optionId)) {
      state.collectDataCompletedIds.push(optionId)
    }
  },

  isCollectDataCompleted(optionId: string): boolean {
    return state.collectDataCompletedIds.includes(optionId)
  },

  async fetchPaymentActions(option: PaymentOption) {
    const payClient = walletkit?.pay
    if (!payClient || !state.paymentOptions) {
      console.error('[PaymentStore] Pay SDK not initialized')
      state.actionsError = 'Pay SDK not initialized'
      return
    }

    state.isLoadingActions = true
    state.actionsError = null

    try {
      const actions = await payClient.getRequiredPaymentActions({
        paymentId: state.paymentOptions.paymentId,
        optionId: option.id,
      })
      state.paymentActions = ref(actions)
    } catch (error: any) {
      console.error('[PaymentStore] Error getting payment actions:', error?.message)
      const errorMessage = error?.message || 'Failed to get payment actions'
      const errorType = detectErrorType(errorMessage)
      state.resultStatus = 'error'
      state.resultMessage = getErrorMessage(errorType, errorMessage)
      state.resultErrorType = errorType
      state.step = 'result'
    } finally {
      state.isLoadingActions = false
    }
  },

  async approvePayment() {
    if (state.step === 'confirming') {
      console.warn('[PaymentStore] Payment already in progress')
      return
    }

    const { paymentActions, selectedOption, paymentOptions } = state

    if (
      !paymentActions ||
      paymentActions.length === 0 ||
      !selectedOption ||
      !paymentOptions
    ) {
      console.warn('[PaymentStore] Cannot approve - missing required state')
      return
    }

    state.step = 'confirming'
    state.actionsError = null

    try {
      const payClient = walletkit?.pay
      if (!payClient) {
        throw new Error('Pay SDK not available')
      }

      const wallet = eip155Wallets[SettingsStore.state.eip155Address]
      const signatures: string[] = []

      for (const [index, action] of paymentActions.entries()) {
        if (action.walletRpc) {
          try {
            const { method, params } = action.walletRpc
            const parsedParams = JSON.parse(params)

            if (
              method === 'eth_signTypedData_v4' ||
              method === 'eth_signTypedData_v3' ||
              method === 'eth_signTypedData'
            ) {
              const typedData = JSON.parse(parsedParams[1])
              const { domain, types, message: messageData } = typedData
              delete types.EIP712Domain
              const signature = await wallet._signTypedData(
                domain,
                types,
                messageData,
              )
              signatures.push(signature)
            } else {
              throw new Error(`Unsupported signature method: ${method}`)
            }
          } catch (error: any) {
            throw new Error(
              `Failed to sign action ${index + 1}: ${error?.message || 'Unknown error'}`,
            )
          }
        }
      }

      const confirmResult = await payClient.confirmPayment({
        paymentId: paymentOptions.paymentId,
        optionId: selectedOption.id,
        signatures,
      })

      if (!confirmResult) {
        throw new Error('Payment confirmation failed - no response received')
      }

      if (confirmResult.status === 'expired') {
        state.resultStatus = 'error'
        state.resultErrorType = 'expired'
        state.resultMessage = getErrorMessage('expired')
        state.step = 'result'
        return
      }

      const amount = formatAmount(
        selectedOption.amount.value,
        selectedOption.amount.display.decimals,
        2,
      )
      state.resultStatus = 'success'
      state.resultMessage = `You've paid ${amount} ${selectedOption.amount.display.assetSymbol} to ${paymentOptions.info?.merchant?.name}`
      state.step = 'result'
    } catch (error: any) {
      console.error('[PaymentStore] Error signing payment:', error?.message)
      const errorMessage = error?.message || 'Failed to sign payment'
      const errorType = detectErrorType(errorMessage)
      state.resultStatus = 'error'
      state.resultErrorType = errorType
      state.resultMessage = getErrorMessage(errorType, errorMessage)
      state.step = 'result'
    }
  },
}

export default PaymentStore
