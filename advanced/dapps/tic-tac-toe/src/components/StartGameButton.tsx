import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const StartGameButton = ({
  isWalletConnected,
  loading,
  startGame,
}: {
  isWalletConnected: boolean;
  loading: boolean;
  startGame: () => void;
}) => {
  const button = (
    <Button
      className=" bg-blue-700 hover:bg-blue-500"
      size="lg"
      variant="default"
      disabled={!isWalletConnected || loading}
      onClick={startGame}
    >
      {loading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : "New Game"}
    </Button>
  );

  return isWalletConnected ? (
    button
  ) : (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>
          <p>Connect your wallet</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default StartGameButton;
