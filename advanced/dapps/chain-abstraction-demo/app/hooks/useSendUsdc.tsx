"use client";
import { config } from "@/config";
import { tokenAddresses } from "@/consts/tokens";
import { erc20Abi, Hex } from "viem";
import { getAccount, getWalletClient } from "wagmi/actions";

export default function useSendUsdc() {
  const sendUsdcAsync = async (address: Hex, amount: number) => {
    const client = await getWalletClient(config);
    const account = getAccount(config);
    const chain = account.chain?.id;
    if (!chain) {
      throw new Error("Chain undefined");
    }
    const contract = tokenAddresses[chain];
    if (!chain) {
      throw new Error("Cant send on specified chain");
    }
    const tx = await client.writeContract({
      abi: erc20Abi,
      address: contract, // arbitrum usdc
      functionName: "transfer",
      args: [address, BigInt(amount)],
    });
    return tx;
  };
  return { sendUsdcAsync };
}
