import { useState, useEffect } from 'react'
import { DetailedPaymentOption } from '@/types/wallet_checkout'
import WalletCheckoutUtil from '@/utils/WalletCheckoutUtil'

/**
 * Custom hook to prepare checkout requests
 *
 * @param request - The request object from the dApp
 * @param address - User's wallet address
 * @returns Object with loading state, error, and feasible payments
 */
export function useCheckoutRequest(request: any, address: string) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [feasiblePayments, setFeasiblePayments] = useState<DetailedPaymentOption[]>([])

  useEffect(() => {
    async function prepareRequest() {
      if (!request?.params?.[0] || !address) {
        setIsLoading(false)
        return
      }

      try {
        const { feasiblePayments } = await WalletCheckoutUtil.prepareCheckoutRequest(
          address,
          request.params[0]
        )
        setFeasiblePayments(feasiblePayments)
      } catch (err) {
        console.error('Error preparing checkout request:', err)
        setError(err instanceof Error ? err : new Error('Failed to prepare checkout request'))
      } finally {
        setIsLoading(false)
      }
    }

    prepareRequest()
  }, [request, address])

  return { isLoading, error, feasiblePayments }
}
