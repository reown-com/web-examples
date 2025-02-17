import { Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GiftDonutModalTrigger } from "@/components/GiftDonutModalTrigger";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";

interface GiftDonutButtonProps {
  isConnected: boolean;
  isLoading: boolean;
  hasEnoughBalance: boolean;
}

export const GiftDonutButton: React.FC<GiftDonutButtonProps> = ({
  isConnected,
  isLoading,
  hasEnoughBalance,
}) => {
  if (!isConnected) {
    return (
      <div>
        <ConnectWalletButton />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <GiftDonutModalTrigger
              triggerText={
                isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading
                  </div>
                ) : (
                  "Gift Donut"
                )
              }
              initialView="Checkout"
              className={`${
                isLoading
                  ? "bg-blue-400"
                  : hasEnoughBalance
                    ? "bg-blue-500 hover:bg-blue-700"
                    : "bg-gray-400 cursor-not-allowed"
              } text-invert`}
              disabled={isLoading || !hasEnoughBalance}
            />
          </div>
        </TooltipTrigger>
        {!isLoading && !hasEnoughBalance && (
          <TooltipContent>
            <p>Insufficient USDC balance</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};
