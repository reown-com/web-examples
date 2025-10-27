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

type PaymentItemStatus = "idle" | "pending" | "rejected" | "completed";

type PaymentItem = {
  id: string;
  amount: string;
  network: NetworkKey;
  status: PaymentItemStatus;
};

type TransactionStatus = "pending" | "success" | "failed";

type TransactionHash = {
  hash: string;
  status: TransactionStatus;
};

let appkit: AppKit | undefined;
let posClient: IPOSClient | undefined;

// Utility function to validate Ethereum address
const isValidEthereumAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export default function Home() {
  const [paymentState, setPaymentState] = useState<PaymentState>("idle");
  const [transactionHashes, setTransactionHashes] = useState<TransactionHash[]>(
    []
  );
  const [paymentItems, setPaymentItems] = useState<PaymentItem[]>([
    { id: "1", amount: "1.00", network: "base", status: "idle" },
  ]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [merchantAddress, setMerchantAddress] = useState("");
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [tempMerchantAddress, setTempMerchantAddress] = useState("");

  useEffect(() => {
    // Check for saved merchant address in localStorage
    const savedMerchantAddress = localStorage.getItem("merchantAddress");
    if (savedMerchantAddress && isValidEthereumAddress(savedMerchantAddress)) {
      setMerchantAddress(savedMerchantAddress);
      setIsSetupComplete(true);
    }

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
      loggerOptions: {
        posLevel: "debug",
      },
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

    posClient.on("payment_failed", (params) => {
      console.log("paymentFailed", params);
      const { transaction } = params;

      // Update transaction status to failed
      setTransactionHashes((prev) =>
        prev.map((tx) =>
          tx.hash === transaction
            ? { ...tx, status: "failed" as TransactionStatus }
            : tx
        )
      );

      toast.error("Payment failed: " + transaction, {
        icon: "💳",
        duration: 4000,
      });
      appkit?.close();
      setPaymentState("payment_failed");
    });

    posClient.on("payment_broadcasted", (paymentBroadcasted) => {
      console.log("paymentBroadcasted", paymentBroadcasted);
      setTransactionHashes((prev) => {
        const newTransaction: TransactionHash = {
          hash: paymentBroadcasted,
          status: "pending",
        };
        const newHashes = [...prev, newTransaction];

        toast.success(`Payment ${newHashes.length} broadcasted to network`, {
          icon: "📡",
          duration: 4000,
        });

        return newHashes;
      });
      appkit?.close();
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
      const { transaction } = paymentSuccessful;

      // Update transaction status to successful
      setTransactionHashes((prev) =>
        prev.map((tx) =>
          tx.hash === transaction
            ? { ...tx, status: "success" as TransactionStatus }
            : tx
        )
      );

      // Mark the first pending payment item as completed
      // In a real scenario, you'd need better linking between transactions and items
      setPaymentItems((prev) => {
        const pendingIndex = prev.findIndex(
          (item) => item.status === "pending"
        );
        if (pendingIndex !== -1) {
          return prev.map((item, index) =>
            index === pendingIndex
              ? { ...item, status: "completed" as PaymentItemStatus }
              : item
          );
        }
        return prev;
      });

      toast.success("Payment completed successfully!", {
        icon: "✅",
        duration: 5000,
      });
      appkit?.close();
      setPaymentState("payment_completed");
    });

    posClient.on("payment_rejected", (paymentRejected) => {
      console.log("paymentRejected", paymentRejected);
      const { paymentIntent } = paymentRejected;

      // Find and mark the matching payment item as rejected
      if (paymentIntent) {
        setPaymentItems((prev) =>
          prev.map((item) => {
            const network = NETWORKS[item.network];
            // Match by amount and network chain ID
            if (
              item.amount === paymentIntent.amount &&
              network.id === paymentIntent.token?.network?.chainId
            ) {
              return { ...item, status: "rejected" as PaymentItemStatus };
            }
            return item;
          })
        );
      }

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

    if (paymentItems.length === 0) {
      toast.error("Please add at least one payment item");
      return;
    }

    // Validate all payment items
    const hasInvalidItems = paymentItems.some(
      (item) => !item.amount || parseFloat(item.amount) <= 0
    );

    if (hasInvalidItems) {
      toast.error("Please enter valid amounts for all payment items");
      return;
    }

    if (!merchantAddress) {
      toast.error("Merchant address not configured");
      return;
    }

    setPaymentState("payment_requesting");

    // Mark all payment items as pending
    setPaymentItems((prev) =>
      prev.map((item) => ({ ...item, status: "pending" as PaymentItemStatus }))
    );

    const paymentIntents: POSClientTypes.PaymentIntent[] = paymentItems.map(
      (item) => {
        const network = NETWORKS[item.network];
        return {
          token: {
            network: { name: network.name, chainId: network.id },
            symbol: "USDC",
            standard: "ERC20",
            address: network.usdcAddress,
          },
          amount: item.amount,
          recipient: `${network.id}:${merchantAddress.trim()}`,
        };
      }
    );

    try {
      await posClient.createPaymentIntent({ paymentIntents });
      toast.success(
        `Payment request created for ${paymentItems.length} item${
          paymentItems.length > 1 ? "s" : ""
        }`,
        {
          icon: "📋",
          duration: 3000,
        }
      );
    } catch (error) {
      console.error("Payment initiation failed:", error);
      toast.error("Failed to initiate payment");
      setPaymentState("payment_failed");
    }
  }, [posClient, isInitialized, paymentItems, merchantAddress]);

  const addPaymentItem = () => {
    const newItem: PaymentItem = {
      id: Date.now().toString(),
      amount: "1.00",
      network: "base",
      status: "idle",
    };
    setPaymentItems((prev) => [...prev, newItem]);
  };

  const removePaymentItem = (id: string) => {
    setPaymentItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updatePaymentItem = (
    id: string,
    updates: Partial<Omit<PaymentItem, "id">>
  ) => {
    setPaymentItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const getTotalAmount = () => {
    return paymentItems.reduce(
      (total, item) => total + parseFloat(item.amount || "0"),
      0
    );
  };

  const resetTransaction = () => {
    setPaymentState("idle");
    setTransactionHashes([]);
    // Reset all payment item statuses to idle
    setPaymentItems((prev) =>
      prev.map((item) => ({ ...item, status: "idle" as PaymentItemStatus }))
    );
  };

  const restart = (reinit = true) => {
    setPaymentState("idle");
    setTransactionHashes([]);
    // Reset all payment item statuses to idle
    setPaymentItems((prev) =>
      prev.map((item) => ({ ...item, status: "idle" as PaymentItemStatus }))
    );
    posClient?.restart({ reinit: reinit });
  };

  const handleSetupMerchant = () => {
    if (!tempMerchantAddress.trim()) {
      toast.error("Please enter a merchant address");
      return;
    }

    if (!isValidEthereumAddress(tempMerchantAddress.trim())) {
      toast.error("Please enter a valid Ethereum address (0x...)");
      return;
    }

    const address = tempMerchantAddress.trim();
    setMerchantAddress(address);
    localStorage.setItem("merchantAddress", address);
    setIsSetupComplete(true);
    setTempMerchantAddress("");
    toast.success("Merchant address configured successfully!", {
      icon: "✅",
      duration: 3000,
    });
  };

  const handleEditMerchant = () => {
    setTempMerchantAddress(merchantAddress);
    setIsSetupComplete(false);
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

  // Setup Screen Component
  if (!isSetupComplete) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6">
        <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          {/* Setup Header */}
          <div className="bg-blue-600 dark:bg-blue-700 text-white p-6 text-center">
            <h1 className="text-2xl font-bold">POS Terminal Setup</h1>
            <p className="text-blue-100 text-sm mt-1">
              Configure your merchant address to receive payments
            </p>
          </div>

          {/* Setup Form */}
          <div className="p-6 space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                🔧 <span className="ml-2">Setup Required</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Merchant Wallet Address
              </label>
              <input
                type="text"
                value={tempMerchantAddress}
                onChange={(e) => setTempMerchantAddress(e.target.value)}
                placeholder="0x1234567890123456789012345678901234567890"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Enter the Ethereum address where you want to receive USDC
                payments
              </p>
            </div>

            <button
              onClick={handleSetupMerchant}
              disabled={!tempMerchantAddress.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-colors text-lg"
            >
              Configure Terminal
            </button>
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6">
      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 dark:bg-blue-700 text-white p-6 text-center">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold">POS Terminal</h1>
              <p className="text-blue-100 text-xs mt-1">
                Crypto Payment System via WalletConnect
              </p>
            </div>
            <button
              onClick={handleEditMerchant}
              className="text-blue-100 hover:text-white text-xs underline"
            >
              Edit Address
            </button>
          </div>
        </div>

        {/* Merchant Address Display */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900 border-b border-gray-200 dark:border-gray-700">
          <p className="text-xs text-blue-700 dark:text-blue-300 mb-1">
            Merchant Address:
          </p>
          <p className="text-xs font-mono text-blue-800 dark:text-blue-200 break-all">
            {merchantAddress}
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

        {/* Transaction Hashes Display */}
        {transactionHashes.length > 0 && (
          <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Transaction Hash{transactionHashes.length > 1 ? "es" : ""}:
            </p>
            <div className="space-y-2">
              {transactionHashes.map((tx, index) => {
                const getStatusIcon = (status: TransactionStatus) => {
                  switch (status) {
                    case "pending":
                      return "⏳";
                    case "success":
                      return "✅";
                    case "failed":
                      return "❌";
                    default:
                      return "⏳";
                  }
                };

                const getStatusColor = (status: TransactionStatus) => {
                  switch (status) {
                    case "pending":
                      return "text-yellow-600 dark:text-yellow-400";
                    case "success":
                      return "text-green-600 dark:text-green-400";
                    case "failed":
                      return "text-red-600 dark:text-red-400";
                    default:
                      return "text-yellow-600 dark:text-yellow-400";
                  }
                };

                return (
                  <div
                    key={tx.hash}
                    className="bg-white dark:bg-gray-800 p-2 rounded border"
                  >
                    <div className="flex items-center justify-between mb-1">
                      {transactionHashes.length > 1 ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Transaction {index + 1}:
                        </p>
                      ) : (
                        <div></div>
                      )}
                      <div
                        className={`flex items-center space-x-1 ${getStatusColor(
                          tx.status
                        )}`}
                      >
                        <span className="text-sm">
                          {getStatusIcon(tx.status)}
                        </span>
                        <span className="text-xs font-medium capitalize">
                          {tx.status}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs font-mono text-gray-600 dark:text-gray-400 break-all">
                      {tx.hash}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Payment Items */}
        <div className="p-6 space-y-6">
          {/* Payment Items Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Payment Items
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Total: ${getTotalAmount().toFixed(2)} USDC
              </p>
            </div>
            <button
              onClick={addPaymentItem}
              disabled={paymentState !== "idle"}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
            >
              + Add Item
            </button>
          </div>

          {/* Payment Items List */}
          <div className="space-y-4">
            {paymentItems.map((item, index) => (
              <div
                key={item.id}
                className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Item {index + 1}
                    </span>
                    {item.status === "rejected" && (
                      <div className="flex items-center space-x-1 text-red-600 dark:text-red-400">
                        <span className="text-sm">❌</span>
                        <span className="text-xs font-medium">Rejected</span>
                      </div>
                    )}
                    {item.status === "pending" && (
                      <div className="flex items-center space-x-1 text-yellow-600 dark:text-yellow-400">
                        <span className="text-sm">⏳</span>
                        <span className="text-xs font-medium">Pending</span>
                      </div>
                    )}
                    {item.status === "completed" && (
                      <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                        <span className="text-sm">✅</span>
                        <span className="text-xs font-medium">Completed</span>
                      </div>
                    )}
                  </div>
                  {paymentItems.length > 1 && (
                    <button
                      onClick={() => removePaymentItem(item.id)}
                      disabled={paymentState !== "idle"}
                      className="text-red-600 hover:text-red-700 disabled:text-gray-400 text-sm font-medium"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {/* Amount Input */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Amount (USDC)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={item.amount}
                      onChange={(e) =>
                        updatePaymentItem(item.id, { amount: e.target.value })
                      }
                      className="w-full px-3 py-2 text-lg font-medium text-center border border-gray-300 dark:border-gray-500 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                      placeholder="0.00"
                      disabled={paymentState !== "idle"}
                    />
                    <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                      $
                    </div>
                  </div>
                </div>

                {/* Network Selection */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Network
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {Object.entries(NETWORKS).map(([key, network]) => (
                      <button
                        key={key}
                        onClick={() =>
                          updatePaymentItem(item.id, {
                            network: key as NetworkKey,
                          })
                        }
                        disabled={paymentState !== "idle"}
                        className={`p-2 rounded-md border text-xs font-medium transition-all ${
                          item.network === key
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500"
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
              </div>
            ))}
          </div>

          {/* Action Button */}
          <div className="pt-4">
            {paymentState === "idle" || paymentState === "payment_failed" ? (
              <button
                onClick={handlePayment}
                disabled={
                  !isInitialized ||
                  paymentItems.length === 0 ||
                  paymentItems.some(
                    (item) => !item.amount || parseFloat(item.amount) <= 0
                  ) ||
                  getTotalAmount() <= 0
                }
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-colors text-lg"
              >
                Request Payment
                {paymentItems.length > 1
                  ? `s (${paymentItems.length} items)`
                  : ""}
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
                  onClick={() => {
                    restart(true);
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 underline underline-offset-2 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    restart(false);
                  }}
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
