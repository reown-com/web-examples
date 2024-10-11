"use client";
import { Button } from "@/components/ui/button";
import useSendUsdc from "./hooks/useSendUsdc";
import { useAccount } from "wagmi";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const sendToAddress = "0x81D8C68Be5EcDC5f927eF020Da834AA57cc3Bd24";
const sendAmount = 6000000;

export default function Transfer() {
  const { sendUsdcAsync } = useSendUsdc();
  const { isConnected, chain } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const onButtonClick = async () => {
    try {
      setIsLoading(true);
      const res = await sendUsdcAsync(sendToAddress, sendAmount);
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
        <Button onClick={onButtonClick} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
            </>
          ) : (
            <>Perform action with USDC on {chain?.name}</>
          )}
        </Button>
      ) : null}
    </>
  );
}
