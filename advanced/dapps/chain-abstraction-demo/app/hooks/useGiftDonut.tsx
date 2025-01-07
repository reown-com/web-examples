"use client";
import { config } from "@/config";
import { tokenAddresses } from "@/consts/tokens";
import { Network, Token } from "@/data/EIP155Data";
import { toast } from "sonner";
import { erc20Abi, Hex } from "viem";
import { getAccount, getWalletClient } from "wagmi/actions";

export default function useGiftDonut() {

  const giftDonutAsync = async (
    to: Hex,
    donutCount: number,
    token: Token,
    network: Network,
  ) => {
    try {
      const client = await getWalletClient(config, {
        chainId: network.chainId,
      });
      const account = getAccount(config);
      const connectedChainId = account.chain?.id;
      if (!connectedChainId) {
        throw new Error("Chain undefined");
      }

      if (connectedChainId !== network.chainId) {
        throw new Error("Please switch chain, connected chain does not match network");
      }
      
      const tokenName = token.name;
      const tokenChainMapping = tokenAddresses[tokenName];
      if (!tokenChainMapping) {
        throw new Error("Token not supported");
      }

      const contract = tokenChainMapping[connectedChainId];
      if (!contract) {
        throw new Error("Cant send on specified chain");
      }
      const tokenAmount = donutCount * 1 * 10 ** 6;
      console.log({ to, tokenAmount, contract });

      const tx = await client.writeContract({
        abi: erc20Abi,
        address: contract,
        functionName: "transfer",
        args: [to, BigInt(tokenAmount)],
      });
      toast.success(`Transaction sent with hash: ${tx}`);
      return tx;
    } catch (e) {

      if (e instanceof Error) {
        toast.error(e.message)
      }
      else {
        toast.error("Error sending gift donut");
      }
      console.error(e);
    }
  };
  return { giftDonutAsync };
}
