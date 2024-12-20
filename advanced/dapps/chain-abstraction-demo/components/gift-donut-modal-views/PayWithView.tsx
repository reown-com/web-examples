import { Network, supportedTokens, Token } from "@/data/EIP155Data";
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

function PayWithkView({ onViewChange, onClose }: GiftDonutModalViewProps) {
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
        <div key={index} className="flex items-center flex-col gap-4 w-full">
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
  return (
    <div className="flex w-full items-center gap-2" onClick={onClick}>
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
        <Label>{token.name}</Label>
        <div>{selected && <CheckIcon color="green" />}</div>
      </div>
    </div>
  );
}

export default PayWithkView;
