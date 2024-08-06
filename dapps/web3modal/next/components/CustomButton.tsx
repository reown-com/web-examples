"use client";

import { useWeb3Modal } from "@web3modal/wagmi/react";
import { useAccount, useDisconnect } from "wagmi";

export default function CustomButton() {
  const { open } = useWeb3Modal();
  const { isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  const baseStyle =
    "px-4 py-2 font-bold text-white rounded-lg transition-all duration-300 ease-in-out transform hover:-translate-y-1 active:translate-y-0 focus:outline-none";

  if (isConnected)
    return (
      <button
        onClick={() => disconnect()}
        className={`${baseStyle} bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600`}
      >
        <span className="mr-2 text-xl">🔓</span>
        Disconnect
      </button>
    );
  return (
    <button
      onClick={() => open()}
      className={`${baseStyle} bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600`}
    >
      <span className="mr-2 text-xl">👛</span>
      Connect Wallet
    </button>
  );
}
