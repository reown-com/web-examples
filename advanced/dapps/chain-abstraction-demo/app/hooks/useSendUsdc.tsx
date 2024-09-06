"use client";
import { config } from "@/config";
import { erc20Abi } from "viem";
import { getWalletClient } from "wagmi/actions";

export default function useSendUsdc() {
  const sendUsdcAsync = async () => {
    const client = await getWalletClient(config);

    const tx = await client.writeContract({
      abi: erc20Abi,
      address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // arbitrum usdc
      functionName: "transfer",
      args: ["0x81D8C68Be5EcDC5f927eF020Da834AA57cc3Bd24", BigInt(500000)],
    });
    return tx;
  };
  return { sendUsdcAsync };
}
