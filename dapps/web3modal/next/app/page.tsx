"use client";

import CustomButton from "@/components/CustomButton";
import { useAccount } from "wagmi";

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <main className="min-h-screen px-8 py-0 pb-12 flex-1 flex flex-col items-center">
      <header className="w-full py-4 flex justify-between items-center">
        <div className="flex items-center">
          <img src="/walletconnect.png" alt="logo" className="w-10 h-10 mr-2" />
          <div className="hidden sm:inline text-xl font-bold">WalletConnect AppKit example app</div>
        </div>
        <div className="flex items-center">
          <w3m-button />
        </div>
      </header>
      <h2 className="my-8 text-2xl font-bold leading-snug text-center">Examples</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl w-full">
        <div className="grid bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <h3 className="text-sm font-semibold bg-gray-100 p-2">Connect button medium</h3>
          <div className="text-xs bg-gray-50 p-2 font-mono overflow-x-auto">{'<w3m-button size="md" />'}</div>
          <div className="flex justify-center items-center p-4">
            <w3m-button size="md" />
          </div>
        </div>
        <div className="grid bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <h3 className="text-sm font-semibold bg-gray-100 p-2">Connect button small</h3>
          <div className="text-xs bg-gray-50 p-2 font-mono overflow-x-auto">
            {'<w3m-button size="sm" label="Connect, pretty please!" />'}
          </div>
          <div className="flex justify-center items-center p-4">
            <w3m-button size="sm" label="Connect, pretty please!" />
          </div>
        </div>

        {isConnected && (
          <>
            {" "}
            <div className="grid bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <h3 className="text-sm font-semibold bg-gray-100 p-2">Account button (only when connected)</h3>
              <div className="text-xs bg-gray-50 p-2 font-mono overflow-x-auto">
                {'<w3m-account-button balance={"show"} />'}
              </div>
              <div className="flex justify-center items-center p-4">
                <w3m-account-button balance={"show"} />
              </div>
            </div>
            <div className="grid bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <h3 className="text-sm font-semibold bg-gray-100 p-2">Account button with balance hidden</h3>
              <div className="text-xs bg-gray-50 p-2 font-mono overflow-x-auto">
                {'<w3m-account-button balance={"hide"} />'}
              </div>
              <div className="flex justify-center items-center p-4">
                <w3m-account-button balance={"hide"} />
              </div>
            </div>
          </>
        )}

        {!isConnected && (
          <div className="grid bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <h3 className="text-sm font-semibold bg-gray-100 p-2">Connect button (only when not connected)</h3>
            <div className="text-xs bg-gray-50 p-2 font-mono overflow-x-auto">{"<w3m-connect-button />"}</div>
            <div className="flex justify-center items-center p-4">
              <w3m-connect-button />
            </div>
          </div>
        )}

        {isConnected && (
          <div className="grid bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <h3 className="text-sm font-semibold bg-gray-100 p-2">Network selection button</h3>
            <div className="text-xs bg-gray-50 p-2 font-mono overflow-x-auto">{"<w3m-network-button />"}</div>
            <div className="flex justify-center items-center p-4">
              <w3m-network-button />
            </div>
          </div>
        )}

        <div className="grid bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <h3 className="text-sm font-semibold bg-gray-100 p-2">Custom button</h3>
          <div className="text-xs bg-gray-50 p-2 font-mono overflow-x-auto">{"Check: components/CustomButton.tsx"}</div>
          <div className="flex justify-center items-center p-4">
            <CustomButton />
          </div>
        </div>
      </div>
      <h2 className="my-8 text-2xl font-bold leading-snug text-center">Docs</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl w-full">
        <a
          href="https://docs.walletconnect.com/appkit/overview"
          className="grid bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
        >
          <div className="flex justify-between items-center bg-gray-100 p-3">
            <h3 className="text-lg font-semibold">AppKit Docs</h3>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div className="p-4">
            <p className="text-left">
              Learn how to use AppKit in your project. Wallet connection, email & social logins, on-ramp, Smart
              Accounts, one-click auth, and more...
            </p>
          </div>
        </a>
        <a
          href="https://docs.walletconnect.com/"
          className="grid bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
        >
          <div className="flex justify-between items-center bg-gray-100 p-3">
            <h3 className="text-lg font-semibold">WalletConnect Docs</h3>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div className="p-4">
            <p className="text-left">
              Check WalletConnect docs. AppKit SDK for when you build apps, WalletKit SDK when you&apos;re building a
              wallet.)
            </p>
          </div>
        </a>
      </div>
    </main>
  );
}
