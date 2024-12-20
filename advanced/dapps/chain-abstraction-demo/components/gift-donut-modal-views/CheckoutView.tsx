import {
  giftDonutModalManager,
  GiftDonutModalViewProps,
} from "@/controllers/GiftDonutModalManager";
import { Button } from "../ui/button";
import Image from "next/image";
import React from "react";
import { cn } from "@/lib/utils";
import { ArrowRight, ChevronRight, X } from "lucide-react";
import CoinSVG from "../assets/CoinSVG";
import NetworkSVG from "../assets/NetworkSVG";

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

  const setDonutCount = (count: number) => {
    if (count < 0) return;
    setCount(count);
    giftDonutModalManager.setDonutCount(count);
  };
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
      <div className="flex items-center gap-2 w-full bg-primary-foreground p-4 rounded-3xl ">
        <Image src="/donut-cover.png" alt="Gift Donut" width={80} height={80} />
        <div className="flex flex-col gap-2 w-full h-full">
          <p className="text-primary font-bold">Donut #1</p>
          <div className="flex flex-col">
            <p className="text-secondary">Price</p>
            <div className="flex justify-between">
              <p className="text-primary font-bold">$1.00</p>
              <div className="text-primary">
                <Button
                  variant="outline"
                  onClick={() => setDonutCount(count - 1)}
                  style={{ backgroundColor: "var(--tertiary-foreground)" }}
                  className="mr-2 rounded-full "
                >
                  -
                </Button>
                {count}
                <Button
                  variant="outline"
                  onClick={() => setDonutCount(count + 1)}
                  style={{ backgroundColor: "var(--tertiary-foreground)" }}
                  className="ml-2 rounded-full "
                >
                  +
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center flex-col gap-2 w-full text-primary">
        <div className="flex w-full items-center gap-2">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              background:
                "var(--foreground-foreground-secondary, rgba(42, 42, 42, 1))",
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
              background:
                "var(--foreground-foreground-secondary, rgba(42, 42, 42, 1))",
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
      <div className="flex justify-between w-full items-center">
        <p className="text-secondary">Total</p>
        <p className="text-md font-bold text-primary">
          ${(count * 1.00).toFixed(2)}
        </p>
      </div>
      <div className="flex gap-2 w-full">
        <button
          onClick={onClose}
          type="button"
          style={{
            border:
              "1px solid var(--border-border-secondary, rgba(79, 79, 79, 1))",
          }}
          className="flex flex-1 text-primary items-center justify-center border-secondary rounded-lg"
        >
          Cancle
        </button>
        <Button
          style={{
            background:
              "var(--foreground-foreground-accent-primary-010, rgba(9, 136, 240, 0.1))",
          }}
          onClick={() => onViewChange("CheckoutReceipentAddress")}
          type="button"
          variant="secondary"
          className="flex flex-1 gap-1"
        >
          <p
            className="flex items-center"
            style={{
              color: "var(--text-text-accent-primary, rgba(9, 136, 240, 1))",
            }}
          >
            Next <ArrowRight className="w-4 h-4" />
          </p>
        </Button>
      </div>
    </div>
  );
}

export default CheckoutView;
