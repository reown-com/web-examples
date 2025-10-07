"use client";

import { AppKit } from "@reown/appkit";
import { useCallback, useEffect, useState } from "react";
import { toast, Toaster } from "react-hot-toast";
import { base, optimism, sepolia } from "@reown/appkit/networks";
import {
  UniversalProvider,
  ConnectParams,
} from "@walletconnect/universal-provider";
import Spinner from "./spinner";

// Network configurations
const NETWORKS = {
  sepolia: {
    id: "eip155:11155111",
    name: "Sepolia",
    displayName: "Sepolia",
    network: sepolia,
    usdcAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // USDC on Sepolia
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

let appkit: AppKit | undefined;
let provider: InstanceType<typeof UniversalProvider> | undefined;

// Utility function to validate Ethereum address
const isValidEthereumAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export default function Home() {
  const [amount, setAmount] = useState("0.10");
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkKey>("base");
  const [isInitialized, setIsInitialized] = useState(false);
  const [merchantAddress, setMerchantAddress] = useState("");
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [tempMerchantAddress, setTempMerchantAddress] = useState("");
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  useEffect(() => {
    // Check for saved merchant address in localStorage
    const savedMerchantAddress = localStorage.getItem("merchantAddress");
    if (savedMerchantAddress && isValidEthereumAddress(savedMerchantAddress)) {
      setMerchantAddress(savedMerchantAddress);
      setIsSetupComplete(true);
    }

    if (appkit) return;

    UniversalProvider.init({
      projectId: process.env.NEXT_PUBLIC_PROJECT_ID!,
      metadata: {
        name: "WalletConnect Pay DApp",
        icons: ["https://appkit.reown.com/metadata-icon.svg"],
        description: "Professional Point of Sale Terminal",
        url: "https://appkit.reown.com",
      },
    })
      .then((_up) => {
        provider = _up;
        appkit = new AppKit({
          projectId: process.env.NEXT_PUBLIC_PROJECT_ID!,
          networks: [sepolia, base, optimism],
          sdkVersion: "html-wagmi-",
          // @ts-expect-error - slight type mismatch due to new universal provider version
          universalProvider: _up,
          manualWCControl: true,
        });
        setupEventListeners();
        setIsInitialized(true);
        toast.success("WalletConnect Pay DApp Ready", {
          icon: "🟢",
          duration: 3000,
        });
      })
      .catch((error) => {
        console.error("Error initializing WalletConnect Pay DApp:", error);
        toast.error("Failed to initialize WalletConnect Pay DApp");
      });
  }, []);

  const setupEventListeners = () => {
    if (!provider) return;

    provider.on("disconnect", () => {
      console.log("disconnected");
      toast.error("Customer wallet disconnected", {
        icon: "🔌",
        duration: 3000,
      });
      appkit?.close();
    });

    provider.on("display_uri", (uri: string) => {
      console.log("qr_ready", uri);
      toast.success("QR code ready for customer", {
        icon: "📱",
        duration: 3000,
      });
      appkit?.open({ uri: uri });
    });
  };

  const handlePayment = useCallback(async () => {
    if (!provider || !isInitialized) {
      toast.error("POS terminal not ready");
      return;
    }

    const paymentAmount = parseFloat(amount);
    if (paymentAmount <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }
    const walletPay: ConnectParams["walletPay"] = {
      version: "1.0.0",
      acceptedPayments: [
        {
          asset: `${NETWORKS[selectedNetwork].id}/erc20:${NETWORKS[selectedNetwork].usdcAddress}`,
          amount: `0x${(parseFloat(amount) * 10 ** 6).toString(16)}`,
          recipient: `${NETWORKS[selectedNetwork].id}:${merchantAddress}`,
        },
      ],
      expiry: 1000,
    };
    console.log("walletPay", walletPay);
    try {
      const session = await provider.connect({
        optionalNamespaces: {
          eip155: {
            methods: ["personal_sign"],
            chains: [NETWORKS[selectedNetwork].id],
            events: ["chainChanged", "accountsChanged"],
          },
        },
        walletPay,
      });
      const walletPayResult = session?.walletPayResult?.[0];
      console.log("walletPayResult", walletPayResult);

      if (walletPayResult?.txid) {
        const txHash = walletPayResult.txid as string;
        setTransactionHash(txHash);
        toast.success(
          `Payment successful! Tx: ${txHash.slice(0, 10)}...${txHash.slice(
            -8
          )}`,
          {
            icon: "✅",
            duration: 5000,
          }
        );
      } else {
        toast.success("Payment successful", {
          icon: "✅",
          duration: 3000,
        });
      }
      console.log("session", session);
    } catch (error) {
      console.error("Error connecting to provider:", error);
      toast.error("Connection rejected", {
        icon: "❌",
        duration: 4000,
      });
    } finally {
      provider.disconnect();
      appkit?.close();
    }
  }, [isInitialized, amount, selectedNetwork, merchantAddress, provider]);

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

  const getPaymentAmount = () => {
    return parseFloat(amount || "0");
  };

  // Setup Screen Component
  if (!isSetupComplete) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6">
        <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          {/* Setup Header */}
          <div className="bg-blue-600 dark:bg-blue-700 text-white p-6 text-center">
            <h1 className="text-2xl font-bold">WalletConnect Pay Setup</h1>
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

  // Main POS Interface
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6">
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        {/* POS Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-700 dark:to-emerald-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">💳 WalletConnect Pay</h1>
              <p className="text-green-100 text-sm mt-1">
                WalletConnect Pay Demo
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {isInitialized ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <span className="w-2 h-2 bg-green-600 rounded-full mr-2 animate-pulse"></span>
                  Ready
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  <Spinner />
                  <span className="ml-2">Initializing...</span>
                </span>
              )}
            </div>
          </div>

          {/* Merchant Info */}
          <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-green-100 mb-1">Merchant Address</p>
                <p className="text-sm font-mono truncate">{merchantAddress}</p>
              </div>
              <button
                onClick={handleEditMerchant}
                className="ml-3 px-3 py-1 text-xs bg-white/20 hover:bg-white/30 rounded-md transition-colors"
              >
                Edit
              </button>
            </div>
          </div>
        </div>

        {/* Payment Details */}
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Payment Details
          </h2>

          {/* Payment Form */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount (USDC)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Network
                </label>
                <select
                  value={selectedNetwork}
                  onChange={(e) =>
                    setSelectedNetwork(e.target.value as NetworkKey)
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="sepolia">Sepolia</option>
                  <option value="base">Base</option>
                  <option value="optimism">Optimism</option>
                </select>
              </div>
            </div>

            {/* Network Info */}
            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              USDC Address:{" "}
              <span className="font-mono">
                {NETWORKS[selectedNetwork].usdcAddress}
              </span>
            </div>
          </div>

          {/* Success Box */}
          {transactionHash && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-green-600 dark:text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                    Payment Successful!
                  </h3>
                  <div className="mt-2">
                    <p className="text-xs text-green-700 dark:text-green-300 mb-1">
                      Transaction Hash:
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded border border-green-200 dark:border-green-700 text-green-900 dark:text-green-100 break-all">
                        {transactionHash}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(transactionHash);
                          toast.success("Transaction hash copied!", {
                            icon: "📋",
                            duration: 2000,
                          });
                        }}
                        className="flex-shrink-0 p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-800 rounded transition-colors"
                        title="Copy to clipboard"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => setTransactionHash(null)}
                    className="mt-3 text-xs text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100 font-medium"
                  >
                    Process New Payment →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Total */}
          {!transactionHash && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                  Payment Amount
                </span>
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  ${getPaymentAmount().toFixed(2)}
                </span>
              </div>

              {/* Process Payment Button */}
              <button
                onClick={handlePayment}
                disabled={!isInitialized || getPaymentAmount() <= 0}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-all text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
              >
                {!isInitialized ? (
                  <span className="flex items-center justify-center">
                    <Spinner />
                    <span className="ml-2">Initializing...</span>
                  </span>
                ) : getPaymentAmount() <= 0 ? (
                  "Enter Amount to Process Payment"
                ) : (
                  `Process Payment - $${getPaymentAmount().toFixed(2)}`
                )}
              </button>
            </div>
          )}
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
