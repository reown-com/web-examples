"use client";
import { config } from "@/config";
import { tokenAddresses } from "@/consts/tokens";
import { Network, Token } from "@/data/EIP155Data";
import {  useAppKitNetwork } from "@reown/appkit/react";
import { erc20Abi, Hex } from "viem";
import { getAccount, getWalletClient } from "wagmi/actions";

export default function useGiftDonut() {
  const { chainId, switchNetwork } = useAppKitNetwork();

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

      console.log({ network });
      console.log({ connectedChainId });

      if (connectedChainId !== network.chainId) {
        console.log("need switching network");
        switchNetwork(network.chain);
        console.log("switched network");
      }
      // wait for network switch
      while (chainId !== network.chainId)
      {
        await new Promise((resolve) => setTimeout(resolve, 2000));
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
      return tx;
    } catch (e) {
      if (e instanceof Error) console.error(e.message);

      console.log("Error sending gift donut");
    }
  };
  return { giftDonutAsync };
}
