import { CheckoutRequest, DetailedPaymentOption } from '@/types/wallet_checkout'
import WalletCheckoutUtil from '@/utils/WalletCheckoutUtil'
import { proxy } from 'valtio'

interface State {
  checkoutRequest: CheckoutRequest | null
  feasiblePayments: DetailedPaymentOption[]
}

const state = proxy<State>({
  checkoutRequest: null,
  feasiblePayments: []
})

const WalletCheckoutCtrl = {
  state,
  actions: {
    setCheckoutRequest(request: CheckoutRequest) {
      state.checkoutRequest = request
    },
    setFeasiblePayments(payments: DetailedPaymentOption[]) {
      state.feasiblePayments = payments
    },
    clearCheckoutRequest() {
      state.checkoutRequest = null
    },
    clearFeasiblePayments() {
      state.feasiblePayments = []
    },
    async prepareFeasiblePayments(request: CheckoutRequest) {
      const payments = await WalletCheckoutUtil.getFeasiblePayments(request)
      this.setFeasiblePayments(payments.feasiblePayments)
      this.setCheckoutRequest(request)
      return payments.feasiblePayments
    },
    reset() {
      state.checkoutRequest = null
      state.feasiblePayments = []
    }
  }
}

export default WalletCheckoutCtrl
