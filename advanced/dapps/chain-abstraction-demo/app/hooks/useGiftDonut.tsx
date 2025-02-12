import { config } from "@/config";
import { tokenAddresses } from "@/consts/tokens";
import { Network, Token } from "@/data/EIP155Data";
import { toast } from "sonner";
import { erc20Abi, Hex } from "viem";
import { getAccount, getWalletClient, getPublicClient } from "wagmi/actions";
import { useState } from "react";
import { TransactionToast } from "@/components/TransactionToast";

export default function useGiftDonut() {
  const [isPending, setIsPending] = useState(false);

  const giftDonutAsync = async (
    to: Hex,
    donutCount: number,
    token: Token,
    network: Network,
  ) => {
    setIsPending(true);
    const startTime = Date.now();
    const toastId = toast(
      <TransactionToast status="waiting-approval" />
    );

    try {
      const client = await getWalletClient(config, {
        chainId: network.chainId,
      });
      const publicClient = getPublicClient(config);
      if (!publicClient) {
        throw new Error("Failed to get public client");
      }
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
        throw new Error("Can't send on specified chain");
      }
      
      const tokenAmount = donutCount * 1 * 10 ** 6;

      // Set up an interval to update the elapsed time
      const updateInterval = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        toast(
          <TransactionToast 
            status="waiting-approval" 
            elapsedTime={elapsedSeconds} 
          />, 
          { id: toastId }
        );
      }, 1000);

      const tx = await client.writeContract({
        abi: erc20Abi,
        address: contract,
        functionName: "transfer",
        args: [to, BigInt(tokenAmount)],
      });

      clearInterval(updateInterval);

      // Start watching the transaction
      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
      const finalElapsedSeconds = Math.floor((Date.now() - startTime) / 1000);

      if (receipt.status === 'success') {
        toast(
          <TransactionToast 
            status="success" 
            elapsedTime={finalElapsedSeconds}
            hash={tx}
            networkName={network.name}
          />, 
          { id: toastId }
        );
      } else {
        toast(
          <TransactionToast 
            status="error" 
            elapsedTime={finalElapsedSeconds}
          />, 
          { id: toastId }
        );
      }

      return tx;
    } catch (e) {
      const finalElapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      if (e instanceof Error) {
        toast(
          <TransactionToast 
            status="error" 
            elapsedTime={finalElapsedSeconds}
          />, 
          { id: toastId }
        );
      }
      console.error(e);
    } finally {
      setIsPending(false);
    }
  };

  return { giftDonutAsync, isPending };
}