import { supportedTokens, Token } from "@/data/EIP155Data";
import { Separator } from "../ui/separator";
import React from "react";
import Image from "next/image";
import { Label } from "../ui/label";
import { CheckIcon, ChevronLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  giftDonutModalManager,
  GiftDonutModalViewProps,
} from "@/controllers/GiftDonutModalManager";
import { Button } from "../ui/button";

function PayWithView({ onViewChange, onClose }: GiftDonutModalViewProps) {
  return (
    <div className={cn("flex flex-col items-start gap-4 text-primary")}>
      <div className="grid grid-cols-3 items-center w-full">
        <div className="flex justify-start">
          <Button variant="ghost" onClick={() => onViewChange("Checkout")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
        <div className="col-end-3 text-center">
          <h1>Pay with</h1>
        </div>
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <TokenList className="w-full" />
    </div>
  );
}

function TokenList({ className }: React.ComponentProps<"form">) {
  const selectedToken = giftDonutModalManager.getToken();
  const [token, setToken] = React.useState<Token | undefined>(selectedToken);

  const setSelectedToken = (token: Token) => {
    setToken(token);
    giftDonutModalManager.setToken(token);
  };

  return (
    <div className={cn("flex flex-col items-start gap-4", className)}>
      {supportedTokens.map((tokenItem, index) => (
        <div key={index} className="w-full">
          <TokenItem
            token={tokenItem}
            selected={token?.address === tokenItem.address}
            onClick={() => setSelectedToken(tokenItem)}
          />
          {supportedTokens.length - 1 !== index && <Separator />}
        </div>
      ))}
    </div>
  );
}

function TokenItem({
  token,
  selected,
  onClick,
}: {
  token: Token;
  selected: boolean;
  onClick: () => void;
}) {
  const balance = giftDonutModalManager.getBalanceBySymbol(token.name);
  const formattedBalance = parseFloat(balance).toFixed(4);

  return (
    <button
      className={cn(
        "w-full p-3 rounded-lg transition-colors",
        "hover:bg-primary-foreground/50",
        "flex items-center gap-3",
      )}
      onClick={onClick}
    >
      <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
        <Image
          src={token.icon}
          alt={token.name}
          width={40}
          height={40}
          className="rounded-full"
        />
      </div>
      <div className="flex flex-1 items-center justify-between">
        <div className="flex flex-col items-start gap-0.5">
          <Label className="font-medium">{token.name}</Label>
          <span className="text-xs text-muted-foreground">
            Balance: ${formattedBalance}
          </span>
        </div>
        {selected && <CheckIcon className="h-5 w-5 text-green-500" />}
      </div>
    </button>
  );
}

export default PayWithView;
