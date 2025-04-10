import { ReceiptView } from "@/components/purchase-donut-modal-views/RecieptView";
import { ErrorView } from "@/components/purchase-donut-modal-views/ErrorView";
import { CheckoutView } from "@/components/purchase-donut-modal-views/CheckoutView";
import { PaymentOptionsView } from "@/components/purchase-donut-modal-views/PaymentOptionsView";
import { walletCheckoutManager, WalletCheckoutModalView } from "@/controllers/WalletCheckoutModalManager";

export const WALLET_CHECKOUT_VIEWS: Record<string, WalletCheckoutModalView> = {
  checkout: {
    component: CheckoutView,
    title: "Checkout"
  },
  receipt: {
    component: ReceiptView,
    title: "Receipt"
  },
  error: {
    component: ErrorView,
    title: "Error"
  },
  paymentOptions: {
    component: PaymentOptionsView,
    title: "Payment Options"
  }
};

export function registerCheckoutViews(): void {
  Object.entries(WALLET_CHECKOUT_VIEWS).forEach(([key, view]) => {
    if (!walletCheckoutManager.getState().views[key]) {
      walletCheckoutManager.registerView(key, view);
    }
  });
}