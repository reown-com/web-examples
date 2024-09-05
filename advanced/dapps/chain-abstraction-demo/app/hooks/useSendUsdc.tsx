"use client";
import { config } from "@/config";
import { erc20Abi } from "viem";
import { getWalletClient } from "wagmi/actions";

export default function useSendUsdc() {
  const sendUsdcAsync = async () => {
    const client = await getWalletClient(config);

    const tx = await client.writeContract({
      abi: erc20Abi,
      address: "0x94a9d9ac8a22534e3faca9f4e7f2e2cf85d5e4c8",
      functionName: "transfer",
      args: [
        "0x81D8C68Be5EcDC5f927eF020Da834AA57cc3Bd24",
        BigInt(300000000000),
      ],
    });
    return tx;
  };
  return { sendUsdcAsync };
}
