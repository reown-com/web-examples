import { proxy, ref } from 'valtio'
import type { PaymentOptionsResponse, PaymentOption } from '@walletconnect/pay'

import { walletkit } from '@/utils/WalletConnectUtil'
import { eip155Wallets } from '@/utils/EIP155WalletUtil'
import { stellarWallets } from '@/utils/StellarWalletUtil'
import { tronWallets } from '@/utils/TronWalletUtil'
import { TRON_SIGNING_METHODS } from '@/data/TronData'
import SettingsStore from '@/store/SettingsStore'
import { detectErrorType, getErrorMessage, formatAmount } from '@/components/PaymentModal/utils'
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
  collectDataCompletedIds: []
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
        hasCollectDataUrl: !!o.collectData?.url
      }))
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

  setResult(payload: { status: 'success' | 'error'; message: string; errorType?: ErrorType }) {
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
        optionId: option.id
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

    if (!paymentActions || paymentActions.length === 0 || !selectedOption || !paymentOptions) {
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

      const signatures: string[] = []

      for (const [index, action] of paymentActions.entries()) {
        if (action.walletRpc) {
          try {
            const { chainId, method, params } = action.walletRpc
            const parsedParams = JSON.parse(params)

            if (
              method === 'eth_signTypedData_v4' ||
              method === 'eth_signTypedData_v3' ||
              method === 'eth_signTypedData'
            ) {
              const wallet = eip155Wallets[SettingsStore.state.eip155Address]
              const typedData = JSON.parse(parsedParams[1])
              const { domain, types, message: messageData } = typedData
              delete types.EIP712Domain
              const signature = await wallet._signTypedData(domain, types, messageData)
              signatures.push(signature)
            } else if (method === 'stellar_signXDR') {
              const stellarAddress = selectedOption.account.split(':')[2]
              const stellarWallet = stellarWallets?.[stellarAddress]
              if (!stellarWallet) {
                throw new Error(`No Stellar wallet found for account: ${stellarAddress}`)
              }
              const xdr = parsedParams[0]?.xdr
              if (!xdr) {
                throw new Error('Missing transaction XDR in payment action params')
              }

              const signedXDR = stellarWallet.signXDR(xdr, chainId)
              signatures.push(signedXDR)
            } else if (method === TRON_SIGNING_METHODS.TRON_SIGN_TRANSACTION) {
              const tronAddress = selectedOption.account.split(':')[2]
              const tronWallet = tronWallets?.[tronAddress]
              if (!tronWallet) {
                throw new Error(`No Tron wallet found for account: ${tronAddress}`)
              }

              const request = Array.isArray(parsedParams) ? parsedParams[0] : parsedParams
              // Compatible with both structures, as in the session request handler:
              // `transaction` is either the transaction or `{ transaction }`.
              const transaction = request?.transaction?.transaction ?? request?.transaction
              if (!transaction) {
                throw new Error('Missing transaction in Tron payment action params')
              }

              // Tron is a sign-only relay: WC Pay built these bytes, committed to their
              // `txID` and broadcasts them itself, so the wallet only signs — it never
              // rebuilds or submits the transaction.
              //
              // The gateway wants `{ raw_data_hex, signature }` as an object in the
              // confirm result, while `signatures` is typed `string[]`, so it goes out
              // stringified — the Pay SDK parses it back into an object on the wire.
              const signedTransaction = tronWallet.signPaymentTransaction(transaction)
              signatures.push(JSON.stringify(signedTransaction))
            } else {
              throw new Error(`Unsupported signature method: ${method}`)
            }
          } catch (error: any) {
            throw new Error(
              `Failed to sign action ${index + 1}: ${error?.message || 'Unknown error'}`
            )
          }
        }
      }

      const confirmResult = await payClient.confirmPayment({
        paymentId: paymentOptions.paymentId,
        optionId: selectedOption.id,
        signatures
      })

      if (!confirmResult) {
        throw new Error('Payment confirmation failed - no response received')
      }

      console.log('[PaymentStore] confirmPayment result:', {
        status: confirmResult.status,
        isFinal: confirmResult.isFinal,
        txId: confirmResult.info?.txId
      })

      if (confirmResult.status === 'expired') {
        state.resultStatus = 'error'
        state.resultErrorType = 'expired'
        state.resultMessage = getErrorMessage('expired')
        state.step = 'result'
        return
      }

      if (confirmResult.status === 'failed' || confirmResult.status === 'cancelled') {
        state.resultStatus = 'error'
        state.resultErrorType = 'generic'
        state.resultMessage = getErrorMessage(
          'generic',
          confirmResult.status === 'failed'
            ? 'The payment failed on chain.'
            : 'The payment was cancelled.'
        )
        state.step = 'result'
        return
      }

      const amount = formatAmount(
        selectedOption.amount.value,
        selectedOption.amount.display.decimals,
        2
      )
      const assetSymbol = selectedOption.amount.display.assetSymbol
      const merchantName = paymentOptions.info?.merchant?.name

      // Chains that accept into the mempool before inclusion — Tron among them — settle
      // asynchronously, so `processing` is the happy path rather than a pending error.
      // The Pay SDK polls for the final status internally, so a `processing` result here
      // means the payment is still in flight: report it and never re-confirm.
      state.resultStatus = 'success'
      state.resultMessage =
        confirmResult.status === 'succeeded'
          ? `You've paid ${amount} ${assetSymbol} to ${merchantName}`
          : `Your ${amount} ${assetSymbol} payment to ${merchantName} is on its way`
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
  }
}

export default PaymentStore
