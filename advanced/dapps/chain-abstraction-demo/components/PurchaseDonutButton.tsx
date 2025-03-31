import { useWalletCheckout } from "@/hooks/useWalletCheckout"
import { Button } from "@/components/ui/button"
import { CheckoutRequest, PaymentOption } from "@/types/wallet_checkout"
import { useAppKitProvider } from "@reown/appkit/react"
import UniversalProvider from '@walletconnect/universal-provider'

const DONUT_PRICE = 0.1

const PRODUCT_METADATA = {
  name: 'Chocolate sprinkle Delight',
  description: 'Donut with extra chocolate sprinkles on top',
  imageUrl: 'https://ca-demo.reown.com/donut.png',
  price: `$${DONUT_PRICE}`
}

const PurchaseDonutButton = () => {
  const { isWalletCheckoutSupported, getPaymentsOptions } = useWalletCheckout()
  const { walletProvider } = useAppKitProvider<UniversalProvider>('eip155')

  const handlePurchaseDonut = async () => {
    if (isWalletCheckoutSupported) {
      const orderId = crypto.randomUUID()
      const expiry = Math.floor(Date.now() / 1000) + 60 * 60
      const donutCount = 1
      const paymentOptions = await getPaymentsOptions()
      
      const adjustedPayments: PaymentOption[] = paymentOptions.map(payment => {
        // Skip if amount is not present (should not happen)
        if (!payment.amount) {
          return payment
        }

        // Parse hex amount and multiply by donut count
        const originalAmount = parseInt(payment.amount, 16)
        const newAmount = (originalAmount * donutCount).toString(16)

        return {
          ...payment,
          amount: `0x${newAmount}`
        }
      })
      const walletCheckoutRequest: CheckoutRequest = {
        orderId,
        acceptedPayments: adjustedPayments,
        products: [PRODUCT_METADATA],
        expiry
      }
      const result = await walletProvider.request({
        method: 'wallet_checkout',
        params: [walletCheckoutRequest]
      })
    }
  }

  return <Button onClick={handlePurchaseDonut}>Purchase Donut</Button>
}

export default PurchaseDonutButton
