"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useSendUsdc from "./hooks/useSendUsdc";
import { useAccount, useReadContract } from "wagmi";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { isAddress } from "viem";
import { tokenAddresses } from "@/consts/tokens";

interface BalanceDisplayProps {
  address: `0x${string}`;
  chainId: number;
}

const BalanceDisplay: React.FC<BalanceDisplayProps> = ({ address, chainId }) => {
  const {
    data: usdcBalance,
    isLoading: usdcBalanceLoading,
  } = useReadContract({
    abi: [
      {
        inputs: [{ internalType: "address", name: "owner", type: "address" }],
        name: "balanceOf",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
    ],
    address: tokenAddresses[chainId],
    functionName: 'balanceOf',
    args: [address],
  });

  // Convert the balance from the smallest unit to USDC
  const formattedBalance = usdcBalanceLoading
    ? 'Loading...'
    : usdcBalance
      ? (parseFloat(usdcBalance.toString()) / 1e6).toFixed(2) // Convert to USDC and format to 2 decimal places
      : '0.00';

  return (
      <p className="text-gray-800 text-lg font-semibold">USDC Balance: {formattedBalance} USDC</p>
  );
};

export default function Transfer() {
  const { sendUsdcAsync } = useSendUsdc();
  const { isConnected, chain, address } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [sendToAddress, setSendToAddress] = useState<string>("");
  const [sendAmount, setSendAmount] = useState<number | string>("");

  if (!chain || !address) {
    return null;
  }

  const onButtonClick = async () => {
    try {
      if (!isAddress(sendToAddress)) {
        toast({
          variant: "destructive",
          title: "Invalid Address",
          description: "Please enter a valid Ethereum address.",
        });
        return;
      }

      const amount = Number(sendAmount);
      if (amount <= 0) {
        toast({
          variant: "destructive",
          title: "Invalid Amount",
          description: "Please enter an amount greater than zero.",
        });
        return;
      }

      // Convert the amount to smallest denomination (e.g., 1 USDC = 1,000,000 in smallest unit)
      const amountInSmallestDenomination = amount * 1e6;

      setIsLoading(true);
      const res = await sendUsdcAsync(sendToAddress, amountInSmallestDenomination);
      console.log("Transaction completed", res);
      toast({
        title: "Transaction completed",
        description: res,
      });
    } catch (error) {
      console.log(error);
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "There was a problem with your request.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {isConnected ? (
        <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md space-y-4">
          <BalanceDisplay address={address} chainId={chain.id} />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onButtonClick();
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                Recipient Address
              </label>
              <Input
                type="text"
                id="address"
                value={sendToAddress}
                onChange={(e) => setSendToAddress(e.target.value)}
                className="mt-1 w-[340px]  block rounded-md  text-black  border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                required
                placeholder="Enter recipient address"
              />
            </div>
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                Amount (in USDC)
              </label>
              <Input
                type="number"
                id="amount"
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                className="mt-1 block w-[340px] text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                required
                placeholder="Enter amount in USDC (e.g., 2 for 2 USDC)"
              />
            </div>
            <Button 
              type="submit" 
              disabled={isLoading || !sendToAddress || !sendAmount} 
              className={`w-full ${isLoading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} transition duration-200`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                </>
              ) : (
                <>Send USDC on {chain?.name}</>
              )}
            </Button>
          </form>
        </div>
      ) : (
        <p className="text-center text-gray-500">Please connect your account to proceed.</p>
      )}
    </>
  );
}