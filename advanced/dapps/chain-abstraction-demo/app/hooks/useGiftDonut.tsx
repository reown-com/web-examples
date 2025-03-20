import { config } from "@/config";
import { tokenAddresses } from "@/consts/tokens";
import { Network, Token } from "@/data/EIP155Data";
import { toast } from "sonner";
import { erc20Abi, Hex, PublicClient } from "viem";
import { getAccount, getWalletClient, getPublicClient } from "wagmi/actions";
import { useState } from "react";
import { TransactionToast } from "@/components/TransactionToast";

type TransactionStatus = "waiting-approval" | "pending" | "success" | "error";

export default function useGiftDonut() {
  const [isPending, setIsPending] = useState(false);

  const updateToast = (
    toastId: ReturnType<typeof toast>,
    status: TransactionStatus,
    {
      elapsedTime,
      hash,
      networkName,
    }: {
      elapsedTime?: number;
      hash?: string;
      networkName?: string;
    } = {},
  ) => {
    toast(
      <TransactionToast
        status={status}
        elapsedTime={elapsedTime}
        hash={hash}
        networkName={networkName}
      />,
      { id: toastId },
    );
  };

  const validateTransaction = async (network: Network) => {
    const client = await getWalletClient(config, { chainId: network.chainId });
    const publicClient = getPublicClient(config);
    if (!publicClient) throw new Error("Failed to get public client");

    const account = getAccount(config);
    const connectedChainId = account.chain?.id;

    if (!connectedChainId) throw new Error("Chain undefined");
    if (connectedChainId !== network.chainId) {
      throw new Error(
        "Please switch chain, connected chain does not match network",
      );
    }

    return { client, publicClient };
  };

  const getTokenContract = (token: Token, chainId: number) => {
    const tokenChainMapping = tokenAddresses[token.name];
    if (!tokenChainMapping) throw new Error("Token not supported");

    const contract = tokenChainMapping[chainId];
    if (!contract) throw new Error("Can't send on specified chain");

    return contract;
  };

  const giftDonutAsync = async (
    to: Hex,
    donutCount: number,
    token: Token,
    network: Network,
  ) => {
    setIsPending(true);
    const startTime = Date.now();
    const toastId = toast(<TransactionToast status="waiting-approval" />);
    let updateInterval: ReturnType<typeof setInterval>;

    try {
      // Validate chain and get clients
      const { client, publicClient } = await validateTransaction(network);
      const chainId = getAccount(config).chain?.id!;

      // Get token contract
      const contract = getTokenContract(token, chainId);
      
      // Calculate token amount using token's decimals
      const tokenAmount = donutCount * 10 ** token.decimals;
      // Start tracking elapsed time
      updateInterval = setInterval(() => {
        updateToast(toastId, "waiting-approval", {
          elapsedTime: Math.floor((Date.now() - startTime) / 1000),
        });
      }, 1000);

      // Send transaction
      const tx = await client.writeContract({
        abi: erc20Abi,
        address: contract,
        functionName: "transfer",
        args: [to, BigInt(tokenAmount)],
      });

      // Update to pending status
      updateToast(toastId, "pending", { hash: tx, networkName: network.name });

      // Wait for transaction
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: tx,
      });
      clearInterval(updateInterval);

      // Update final status
      const finalElapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      const finalStatus = receipt.status === "success" ? "success" : "error";

      updateToast(toastId, finalStatus, {
        elapsedTime: finalElapsedSeconds,
        hash: tx,
        networkName: network.name,
      });

      return tx;
    } catch (e) {
      clearInterval(updateInterval!);
      const finalElapsedSeconds = Math.floor((Date.now() - startTime) / 1000);

      if (e instanceof Error) {
        updateToast(toastId, "error", { elapsedTime: finalElapsedSeconds });
      }
      console.error(e);
    } finally {
      setIsPending(false);
    }
  };

  return { giftDonutAsync, isPending };
}
