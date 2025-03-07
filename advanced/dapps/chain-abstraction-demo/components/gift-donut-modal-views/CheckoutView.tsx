import {
  giftDonutModalManager,
  GiftDonutModalViewProps,
} from "@/controllers/GiftDonutModalManager";
import { Button } from "../ui/button";
import Image from "next/image";
import React from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowRight, ChevronRight, X } from "lucide-react";
import CoinSVG from "../assets/CoinSVG";
import NetworkSVG from "../assets/NetworkSVG";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

function CheckoutView({ onViewChange, onClose }: GiftDonutModalViewProps) {
  return (
    <div>
      <GiftDonutForm onClose={onClose} onViewChange={onViewChange} />
    </div>
  );
}

interface GiftDonutFormProps extends React.ComponentProps<"form"> {
  onViewChange: (viewKey: string) => void;
  onClose: () => void;
}

function GiftDonutForm({
  className,
  onViewChange,
  onClose,
}: GiftDonutFormProps) {
  const donutCount = giftDonutModalManager.getDonutCount();
  const [count, setCount] = React.useState(donutCount);

  const selectedToken = giftDonutModalManager.getToken();
  const selectedNetwork = giftDonutModalManager.getNetwork();
  const tokenBalance = giftDonutModalManager.getBalanceBySymbol(selectedToken.name);
  const maxDonutPurchasable = Math.trunc(parseFloat(tokenBalance) / 1.0);
  
  // If there's a selected network but the token is not compatible, automatically redirect
  React.useEffect(() => {
    if (selectedNetwork && !giftDonutModalManager.isTokenNetworkCompatible()) {
      // We need to change the network since this token isn't supported here
      onViewChange("ChooseNetwork");
    }
  }, [selectedToken, selectedNetwork, onViewChange]);

  // Allow any count >= 0.
  const setDonutCount = (newCount: number) => {
    if (newCount < 0) return;
    setCount(newCount);
    giftDonutModalManager.setDonutCount(newCount);
  };

  // Check whether the selected count exceeds the available balance.
  const isExceeded = count > maxDonutPurchasable;

  return (
    <div className={cn("flex flex-col items-start gap-4", className)}>
      <div className="grid grid-cols-3 items-center w-full">
        <div className="col-start-2 col-end-3 text-center">
          <h1 className="text-primary">Gift Donut</h1>
        </div>
        <div className="col-start-3 flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            <X className="text-primary h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2 w-full bg-primary-foreground p-4 rounded-3xl">
        <Image src="/donut-cover.png" alt="Gift Donut" width={80} height={80} />
        <div className="flex flex-col gap-2 w-full h-full">
          <p className="text-primary font-bold">Donut #1</p>
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <p className="text-secondary">Price</p>
              <Button
                variant="link"
                size="sm"
                onClick={() => setDonutCount(maxDonutPurchasable)}
                className="text-xs h-auto p-0 text-secondary hover:text-primary"
              >
                Max: {maxDonutPurchasable}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-primary font-bold">$1.00</p>
              <div className="flex items-center text-primary">
                <Button
                  variant="outline"
                  onClick={() => setDonutCount(count - 1)}
                  style={{ backgroundColor: "var(--tertiary-foreground)" }}
                  className="h-8 w-8 rounded-full p-0"
                  disabled={count <= 0}
                >
                  -
                </Button>
                <div className="w-8 text-center">{count}</div>
                <Button
                  variant="outline"
                  onClick={() => setDonutCount(count + 1)}
                  style={{ backgroundColor: "var(--tertiary-foreground)" }}
                  className="h-8 w-8 rounded-full p-0"
                >
                  +
                </Button>
              </div>
            </div>
            {/* Removed inline error message block */}
          </div>
        </div>
      </div>
      <div className="flex items-center flex-col gap-2 w-full text-primary">
        <div className="flex w-full items-center gap-2">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              background: "var(--foreground-foreground-secondary, rgba(42, 42, 42, 1))",
            }}
          >
            <CoinSVG />
          </div>
          <div className="flex flex-1 items-center justify-between">
            <p>Pay with</p>
            <div className="flex gap-4 items-center justify-between cursor-pointer">
              <div
                className="flex gap-1 p-1 rounded-full text-sm items-center"
                style={{ backgroundColor: "var(--tertiary-foreground)" }}
                onClick={() => onViewChange("PayWith")}
              >
                {selectedToken && (
                  <div className="rounded-full">
                    <Image
                      src={selectedToken.icon}
                      alt="Token"
                      width={14}
                      height={14}
                      className="object-contain rounded-full"
                    />
                  </div>
                )}
                <p>{selectedToken ? selectedToken.name : "Pay with"}</p>
              </div>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
        <div className="flex w-full items-center gap-2">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              background: "var(--foreground-foreground-secondary, rgba(42, 42, 42, 1))",
            }}
          >
            <NetworkSVG />
          </div>
          <div className="flex flex-1 items-center justify-between">
            <p>Choose Network</p>
            <div className="flex gap-4 items-center justify-between cursor-pointer">
              <div
                className="flex gap-1 p-1 rounded-full text-sm items-center"
                style={{ backgroundColor: "var(--tertiary-foreground)" }}
                onClick={() => onViewChange("ChooseNetwork")}
              >
                {selectedNetwork && (
                  <div className="rounded-full">
                    <Image
                      src={selectedNetwork.icon}
                      alt="Network"
                      width={14}
                      height={14}
                      className="object-contain rounded-full"
                    />
                  </div>
                )}
                {selectedNetwork ? selectedNetwork.name : "Choose network"}
              </div>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
      {/* Total Section Updated with Tooltip and Warning Icon */}
      <div className="flex justify-between w-full items-center">
        <p className="text-secondary">Total</p>
        {isExceeded ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <p className="text-md font-bold text-yellow-500">
                    ${(count * 1.0).toFixed(2)}
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-primary-foreground">
                <p className="text-xs text-primary">
                  Warning: Your selected count exceeds your token balance
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <p className="text-md font-bold text-primary">
            ${(count * 1.0).toFixed(2)}
          </p>
        )}
      </div>
      <div className="flex gap-2 w-full">
        <button
          onClick={onClose}
          type="button"
          style={{
            border: "1px solid var(--border-border-secondary, rgba(79, 79, 79, 1))",
          }}
          className="flex flex-1 text-primary items-center justify-center border-secondary rounded-lg"
        >
          Cancel
        </button>
        <Button
          style={{
            background: "var(--foreground-foreground-accent-primary-010, rgba(9, 136, 240, 0.1))",
          }}
          onClick={() => {
            // If token and network are incompatible, redirect to network selection
            if (!giftDonutModalManager.isTokenNetworkCompatible()) {
              onViewChange("ChooseNetwork");
            } else {
              onViewChange("CheckoutReceipentAddress");
            }
          }}
          type="button"
          variant="secondary"
          className="flex flex-1 gap-1"
          disabled={!giftDonutModalManager.isTokenNetworkCompatible()}
        >
          <p
            className="flex items-center"
            style={{ color: "var(--text-text-accent-primary, rgba(9, 136, 240, 1))" }}
          >
            {!giftDonutModalManager.isTokenNetworkCompatible() ? "Choose Network" : "Next"} <ArrowRight className="w-4 h-4" />
          </p>
        </Button>
      </div>
    </div>
  );
}

export default CheckoutView;
