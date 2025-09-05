"use client";

import { AppKit } from "@reown/appkit";
import { useCallback, useEffect, useState } from "react";
import { toast, Toaster } from "react-hot-toast";
import { base, mainnet, optimism } from "@reown/appkit/networks";
import {
  IPOSClient,
  POSClient,
  POSClientTypes,
} from "@walletconnect/pos-client";
import Spinner from "./spinner";

// Network configurations
const NETWORKS = {
  ethereum: {
    id: "eip155:1",
    name: "Ethereum",
    displayName: "Ethereum",
    network: mainnet,
    usdcAddress: "0xA0b86a33E6441A8469A53D2b5eE5a6B7bc2c9Beb", // USDC on Ethereum
  },
  base: {
    id: "eip155:8453",
    name: "Base",
    displayName: "Base",
    network: base,
    usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
  },
  optimism: {
    id: "eip155:10",
    name: "Optimism",
    displayName: "Optimism",
    network: optimism,
    usdcAddress: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607", // USDC on Optimism
  },
} as const;

type NetworkKey = keyof typeof NETWORKS;

type PaymentState =
  | "idle"
  | "connecting"
  | "payment_requesting"
  | "payment_processing"
  | "payment_completed"
  | "payment_failed";

let appkit: AppKit | undefined;
let posClient: IPOSClient | undefined;

export default function Home() {
  const [paymentState, setPaymentState] = useState<PaymentState>("idle");
  const [transactionHash, setTransactionHash] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkKey>("base");
  const [amount, setAmount] = useState("1.00");
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (appkit) return;

    setPaymentState("connecting");

    appkit = new AppKit({
      projectId: process.env.NEXT_PUBLIC_PROJECT_ID!,
      networks: [mainnet, base, optimism],
      sdkVersion: "html-wagmi-",
    });

    POSClient.init({
      projectId: process.env.NEXT_PUBLIC_PROJECT_ID!,
      metadata: {
        merchantName: "Crypto POS Terminal",
        logoIcon: "https://appkit.reown.com/metadata-icon.svg",
        description: "Professional Point of Sale Terminal",
        url: "https://appkit.reown.com",
      },
      deviceId: "pos-terminal-1234",
    })
      .then((_posClient) => {
        posClient = _posClient;
        setupEventListeners();
        setIsInitialized(true);
        setPaymentState("idle");
        toast.success("POS Terminal Ready", {
          icon: "🟢",
          duration: 3000,
        });
      })
      .catch((error) => {
        console.error("Error initializing POS client:", error);
        toast.error("Failed to initialize POS terminal");
        setPaymentState("payment_failed");
      });
  }, []);

  const setupEventListeners = () => {
    if (!posClient) return;

    posClient.on("connected", (connected) => {
      connected = true;
      console.log("connected", connected);
      toast.success("Customer wallet connected", {
        icon: "🔗",
        duration: 3000,
      });
      appkit?.close();
    });

    posClient.on("disconnected", (disconnected) => {
      console.log("disconnected", disconnected);
      toast.error("Customer wallet disconnected", {
        icon: "🔌",
        duration: 3000,
      });
      appkit?.close();
      setPaymentState("idle");
    });

    posClient.on("connection_failed", (connectionFailed) => {
      console.log("connectionFailed", connectionFailed);
      toast.error("Connection failed", {
        icon: "❌",
        duration: 4000,
      });
      appkit?.close();
      setPaymentState("payment_failed");
    });

    posClient.on("connection_rejected", (connectionRejected) => {
      console.log("connectionRejected", connectionRejected);
      toast.error("Customer rejected connection", {
        icon: "🚫",
        duration: 4000,
      });
      appkit?.close();
      setPaymentState("payment_failed");
    });

    posClient.on("payment_failed", (paymentFailed) => {
      console.log("paymentFailed", paymentFailed);
      toast.error("Payment failed", {
        icon: "💳",
        duration: 4000,
      });
      appkit?.close();
      setPaymentState("payment_failed");
    });

    posClient.on("payment_broadcasted", (paymentBroadcasted) => {
      console.log("paymentBroadcasted", paymentBroadcasted);
      toast.success("Payment broadcasted to network", {
        icon: "📡",
        duration: 4000,
      });
      appkit?.close();
      setTransactionHash(paymentBroadcasted);
      setPaymentState("payment_processing");
    });

    posClient.on("payment_requested", (paymentRequested) => {
      console.log("paymentRequested", paymentRequested);
      toast.success("Payment request sent to customer", {
        icon: "📱",
        duration: 3000,
      });
      setPaymentState("payment_requesting");
    });

    posClient.on("payment_successful", (paymentSuccessful) => {
      console.log("paymentSuccessful", paymentSuccessful);
      toast.success("Payment completed successfully!", {
        icon: "✅",
        duration: 5000,
      });
      appkit?.close();
      setPaymentState("payment_completed");
    });

    posClient.on("payment_rejected", (paymentRejected) => {
      console.log("paymentRejected", paymentRejected);
      toast.error("Customer rejected payment", {
        icon: "❌",
        duration: 4000,
      });
      appkit?.close();
      setPaymentState("payment_failed");
    });

    posClient.on("qr_ready", ({ uri }) => {
      console.log("qr_ready", uri);
      toast.success("QR code ready for customer", {
        icon: "📱",
        duration: 3000,
      });
      setPaymentState("connecting");
      appkit?.open({ uri: uri });
    });
  };

  const handlePayment = useCallback(async () => {
    if (!posClient || !isInitialized) {
      toast.error("POS terminal not ready");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const network = NETWORKS[selectedNetwork];
    setPaymentState("payment_requesting");

    const recipient = prompt("Enter the recipient address");
    if (!recipient) {
      toast.error("No recipient found for the selected network: " + network.id);
      return;
    }

    const paymentIntents: POSClientTypes.PaymentIntent[] = [
      {
        token: {
          network: { name: network.name, chainId: network.id },
          symbol: "USDC",
          standard: "ERC20",
          address: network.usdcAddress,
        },
        amount: amount,
        recipient: recipient.trim(),
      },
    ];

    try {
      await posClient.createPaymentIntent({ paymentIntents });
    } catch (error) {
      console.error("Payment initiation failed:", error);
      toast.error("Failed to initiate payment");
      setPaymentState("payment_failed");
    }
  }, [posClient, isInitialized, amount, selectedNetwork]);

  const resetTransaction = () => {
    setPaymentState("idle");
    setTransactionHash("");
  };

  const restart = () => {
    setPaymentState("idle");
    setTransactionHash("");
    posClient?.restart();
  };

  const getStatusMessage = () => {
    switch (paymentState) {
      case "connecting":
        return "Initializing terminal...";
      case "payment_requesting":
        return "Requesting payment from customer...";
      case "payment_processing":
        return "Processing payment on blockchain...";
      case "payment_completed":
        return "Payment completed successfully!";
      case "payment_failed":
        return "Payment failed. Please try again.";
      default:
        return "Ready to accept payments";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6">
      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 dark:bg-blue-700 text-white p-6 text-center">
          <h1 className="text-2xl font-bold">Sample POS Terminal</h1>
          <p className="text-blue-100 text-sm mt-1">
            Crypto Payment System via the WalletConnect network
          </p>
        </div>

        {/* Status Display */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                paymentState === "idle"
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : paymentState === "payment_completed"
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : paymentState === "payment_failed"
                  ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                  : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
              }`}
            >
              {paymentState === "idle" && "🟢"}
              {paymentState === "connecting" && "🔄"}
              {paymentState === "payment_requesting" && "📱"}
              {paymentState === "payment_processing" && "⏳"}
              {paymentState === "payment_completed" && "✅"}
              {paymentState === "payment_failed" && "❌"}
              <span className="ml-2">{getStatusMessage()}</span>
            </div>
          </div>
        </div>

        {/* Transaction Hash Display */}
        {transactionHash && (
          <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Transaction Hash:
            </p>
            <p className="text-xs font-mono text-gray-600 dark:text-gray-400 break-all bg-white dark:bg-gray-800 p-2 rounded border">
              {transactionHash}
            </p>
          </div>
        )}

        {/* Payment Form */}
        <div className="p-6 space-y-6">
          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Amount (USDC)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 text-2xl font-bold text-center border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="0.00"
                disabled={paymentState !== "idle"}
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-xl">
                $
              </div>
            </div>
          </div>

          {/* Network Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Payment Network
            </label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(NETWORKS).map(([key, network]) => (
                <button
                  key={key}
                  onClick={() => setSelectedNetwork(key as NetworkKey)}
                  disabled={paymentState !== "idle"}
                  className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                    selectedNetwork === key
                      ? "bg-blue-600 text-white border-blue-600 shadow-md"
                      : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                  } ${
                    paymentState !== "idle"
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                >
                  {network.displayName}
                </button>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-4">
            {paymentState === "idle" || paymentState === "payment_failed" ? (
              <button
                onClick={handlePayment}
                disabled={!isInitialized || !amount || parseFloat(amount) <= 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-colors text-lg"
              >
                Request Payment
              </button>
            ) : paymentState === "payment_completed" ? (
              <button
                onClick={resetTransaction}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg transition-colors text-lg"
              >
                New Transaction
              </button>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 space-y-4">
                <Spinner />
                <button
                  onClick={restart}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 underline underline-offset-2 transition-colors"
                >
                  Cancel & Restart
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "white",
            color: "black",
            fontWeight: "500",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          },
        }}
      />
    </div>
  );
}
