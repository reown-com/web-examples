import { proxy, ref } from "valtio";
import { walletkit } from "@/utils/walletConnect";
import {
  getEvmAccount,
  getEvmSigningAccount,
  getSolanaAccount,
} from "@/lib/WDKWallet";
import { SolanaSigner } from "@/lib/solanaSigner";
import {
  detectErrorType,
  formatAmount,
  getErrorMessage,
} from "@/components/payment/paymentUtils";
import type {
  Action,
  ErrorType,
  PaymentInfo,
  PaymentOption,
  PaymentOptionsResponse,
  Step,
} from "@/components/payment/paymentUtils";

type EvmAccount = Awaited<ReturnType<typeof getEvmAccount>>;

/** Maps a Pay eth_sendTransaction/eth_signTransaction action param to a WDK EvmTransaction. */
function mapActionTransaction(raw: any, caip2: string) {
  const tx: Record<string, unknown> = {
    to: raw.to,
    value: raw.value ? BigInt(raw.value) : 0n,
    chainId: Number(caip2.split(":")[1]),
  };
  if (raw.data && raw.data !== "0x") tx.data = raw.data;
  if (raw.gas ?? raw.gasLimit) tx.gasLimit = BigInt(raw.gas ?? raw.gasLimit);
  if (raw.nonce !== undefined) tx.nonce = Number(raw.nonce);
  return tx as any;
}

/** Polls for a transaction receipt so an approval is mined before the payment settles. */
async function waitForReceipt(
  account: EvmAccount,
  hash: string,
  attempts = 30,
  delayMs = 2000,
) {
  for (let i = 0; i < attempts; i++) {
    const receipt = await account.getTransactionReceipt(hash).catch(() => null);
    if (receipt) return;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

interface PaymentState {
  paymentOptions: PaymentOptionsResponse | null;
  loadingMessage: string | null;
  errorMessage: string | null;
  step: Step;

  resultStatus: "success" | "error";
  resultMessage: string;
  resultErrorType: ErrorType | null;

  selectedOption: PaymentOption | null;
  paymentActions: Action[] | null;
  isLoadingActions: boolean;
  actionsError: string | null;

  collectDataCompletedIds: string[];
}

const initialState: PaymentState = {
  paymentOptions: null,
  loadingMessage: null,
  errorMessage: null,
  step: "loading",
  resultStatus: "success",
  resultMessage: "",
  resultErrorType: null,
  selectedOption: null,
  paymentActions: null,
  isLoadingActions: false,
  actionsError: null,
  collectDataCompletedIds: [],
};

const state = proxy<PaymentState>({ ...initialState });

const PaymentStore = {
  state,

  startPayment(params: { loadingMessage?: string; errorMessage?: string }) {
    Object.assign(state, { ...initialState });
    state.loadingMessage = params.loadingMessage ?? null;
    state.errorMessage = params.errorMessage ?? null;
  },

  setPaymentOptions(options: PaymentOptionsResponse) {
    state.paymentOptions = ref(options);
    state.loadingMessage = null;
    state.errorMessage = null;
    state.resultErrorType = null;
  },

  setError(errorMessage: string) {
    const errorType = detectErrorType(errorMessage);
    state.errorMessage = errorMessage;
    state.loadingMessage = null;
    state.resultStatus = "error";
    state.resultMessage = getErrorMessage(errorType, errorMessage);
    state.resultErrorType = errorType;
    state.step = "result";
  },

  reset() {
    Object.assign(state, { ...initialState });
  },

  setStep(step: Step) {
    state.step = step;
  },

  setResult(payload: {
    status: "success" | "error";
    message: string;
    errorType?: ErrorType;
  }) {
    state.resultStatus = payload.status;
    state.resultMessage = payload.message;
    state.resultErrorType = payload.errorType ?? null;
    state.errorMessage = null;
    state.loadingMessage = null;
    state.step = "result";
  },

  selectOption(option: PaymentOption) {
    state.selectedOption = ref(option);
  },

  markCollectDataCompleted(optionId: string) {
    if (!state.collectDataCompletedIds.includes(optionId)) {
      state.collectDataCompletedIds.push(optionId);
    }
  },

  async fetchPaymentActions(option: PaymentOption) {
    const payClient = walletkit?.pay;
    if (!payClient || !state.paymentOptions) {
      state.actionsError = "Pay SDK not initialized";
      return;
    }

    state.isLoadingActions = true;
    state.actionsError = null;

    try {
      const actions = await payClient.getRequiredPaymentActions({
        paymentId: state.paymentOptions.paymentId,
        optionId: option.id,
      });
      console.log("actions", actions);
      state.paymentActions = ref(actions);
    } catch (error: any) {
      const message = error?.message || "Failed to get payment actions";
      const errorType = detectErrorType(message);
      state.resultStatus = "error";
      state.resultMessage = getErrorMessage(errorType, message);
      state.resultErrorType = errorType;
      state.step = "result";
    } finally {
      state.isLoadingActions = false;
    }
  },

  async approvePayment() {
    if (state.step === "confirming") return;

    const { paymentActions, selectedOption, paymentOptions } = state;
    if (!paymentActions?.length || !selectedOption || !paymentOptions) return;

    state.step = "confirming";
    state.actionsError = null;

    try {
      const payClient = walletkit?.pay;
      if (!payClient) throw new Error("Pay SDK not available");

      // Sign each required action with the matching WDK-derived key. Actions are
      // chain-specific: EVM uses EIP-712 typed-data permits, Solana signs the
      // serialized transaction the Pay backend asks for. Signers are created lazily.
      let evmAccount: Awaited<ReturnType<typeof getEvmSigningAccount>> | null =
        null;
      let solanaSigner: SolanaSigner | null = null;

      const getEvm = async () => (evmAccount ??= await getEvmSigningAccount());
      const getSolana = async () => {
        if (!solanaSigner) {
          const account = await getSolanaAccount();
          if (!account.keyPair.privateKey)
            throw new Error("Solana private key is unavailable");
          solanaSigner = SolanaSigner.fromSeed(account.keyPair.privateKey);
        }
        return solanaSigner;
      };

      const signatures: string[] = [];

      for (const [index, action] of paymentActions.entries()) {
        if (!action.walletRpc) continue;
        const { method, params } = action.walletRpc;
        try {
          const parsedParams = JSON.parse(params);

          if (method.startsWith("eth_signTypedData")) {
            // params: [address, typedDataJsonString]
            const typedData = JSON.parse(parsedParams[1]);
            const { EIP712Domain, ...types } = typedData.types ?? {};
            const signature = await (
              await getEvm()
            ).signTypedData({
              domain: typedData.domain,
              types,
              message: typedData.message,
            });
            signatures.push(signature);
          } else if (
            method === "solana_signTransaction" ||
            method === "solana_signAndSendTransaction"
          ) {
            // params: { transaction: base64 } (or the raw serialized string)
            const req = Array.isArray(parsedParams)
              ? parsedParams[0]
              : parsedParams;
            const txParam =
              typeof req === "string" ? { transaction: req } : req;
            const { signature } = (await getSolana()).signTransaction(txParam);
            signatures.push(signature);
          } else if (method === "solana_signMessage") {
            const req = Array.isArray(parsedParams)
              ? parsedParams[0]
              : parsedParams;
            signatures.push((await getSolana()).signMessage(req).signature);
          } else if (
            method === "eth_sendTransaction" ||
            method === "eth_signTransaction"
          ) {
            // Tokens without EIP-2612 permit (e.g. USDT) settle via Permit2, which
            // first needs an on-chain approve(Permit2). The Pay backend returns that
            // approval as an eth_sendTransaction action — broadcast it, wait for it to
            // be mined so the allowance exists, then hand back the tx hash.
            const account = await getEvmAccount(action.walletRpc.chainId);
            const rawTx = Array.isArray(parsedParams)
              ? parsedParams[0]
              : parsedParams;
            const tx = mapActionTransaction(rawTx, action.walletRpc.chainId);
            if (method === "eth_signTransaction") {
              signatures.push(await account.signTransaction(tx));
            } else {
              const { hash } = await account.sendTransaction(tx);
              await waitForReceipt(account, hash);
              signatures.push(hash);
            }
          } else {
            throw new Error(`Unsupported signature method: ${method}`);
          }
        } catch (error: any) {
          throw new Error(
            `Failed to sign action ${index + 1}: ${error?.message || "Unknown error"}`,
          );
        }
      }

      const confirmResult = await payClient.confirmPayment({
        paymentId: paymentOptions.paymentId,
        optionId: selectedOption.id,
        signatures,
      });

      if (!confirmResult)
        throw new Error("Payment confirmation failed - no response received");

      if (confirmResult.status === "expired") {
        state.resultStatus = "error";
        state.resultErrorType = "expired";
        state.resultMessage = getErrorMessage("expired");
        state.step = "result";
        return;
      }

      const amount = formatAmount(
        selectedOption.amount.value,
        selectedOption.amount.display.decimals,
        2,
      );
      state.resultStatus = "success";
      state.resultMessage = `You've paid ${amount} ${selectedOption.amount.display.assetSymbol} to ${
        (paymentOptions.info as PaymentInfo | undefined)?.merchant?.name ??
        "the merchant"
      }`;
      state.step = "result";
    } catch (error: any) {
      const message = error?.message || "Failed to sign payment";
      const errorType = detectErrorType(message);
      state.resultStatus = "error";
      state.resultErrorType = errorType;
      state.resultMessage = getErrorMessage(errorType, message);
      state.step = "result";
    }
  },
};

export default PaymentStore;
