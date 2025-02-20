import {
  giftDonutModalManager,
  GiftDonutModalViewProps,
} from "@/controllers/GiftDonutModalManager";
import { Button } from "../ui/button";
import Image from "next/image";
import React from "react";
import { cn } from "@/lib/utils";
import { ArrowLeft, ChevronLeft, Copy, UserRound, X } from "lucide-react";
import { Input } from "../ui/input";
import GiftSvg from "../assets/GiftSVG";
import useGiftDonut from "@/app/hooks/useGiftDonut";
import { toast } from "sonner";

function CheckoutReceipentAddressView({
  onViewChange,
  onClose,
}: GiftDonutModalViewProps) {
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
  const recipient = giftDonutModalManager.getRecipient();
  const [recipientAddress, setRecipientAddress] = React.useState(
    recipient || "",
  );
  const { giftDonutAsync, isPending } = useGiftDonut();

  const setRecipient = (address: string) => {
    setRecipientAddress(address);
    giftDonutModalManager.setRecipient(address);
  };

  const handleCheckout = async () => {
    try {
      const to = recipientAddress as `0x${string}`;
      const token = giftDonutModalManager.getToken();
      const network = giftDonutModalManager.getNetwork();
      if (!network) {
        throw new Error("Network not selected");
      }

      // Start the transaction before closing the modal
      const giftPromise = giftDonutAsync(to, donutCount, token, network);
      onClose(); // Close modal after initiating transaction
      await giftPromise; // Wait for transaction to complete
    } catch (e) {
      console.error(e);
      if (e instanceof Error) {
        toast.error(e.message);
      }
    }
  };

  return (
    <div
      className={cn("flex flex-col items-start gap-4 text-primary", className)}
    >
      <div className="grid grid-cols-3 items-center w-full">
        <div className="flex justify-start">
          <Button variant="ghost" onClick={() => onViewChange("Checkout")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
        <div className="col-start-2 col-end-3 text-center">
          <h1>Gift Donut</h1>
        </div>
        <div className="col-start-3 flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex flex-col items-center gap-2 w-full bg-primary-foreground p-4 rounded-3xl">
        <div className="flex items-center gap-2 w-full">
          <Image
            src="/donut-cover.png"
            alt="Gift Donut"
            width={80}
            height={80}
            className="rounded-lg"
          />
          <div className="flex flex-col gap-2 w-full h-full">
            <p className="text-xl font-bold">Donut #1</p>
            <div className="grid grid-cols-2">
              <div className="flex flex-col">
                <p className="text-xs text-secondary">Price</p>
                <span className="text-lg font-bold">$1.00</span>
              </div>
              <div className="flex flex-col">
                <p className="text-xs text-secondary">Qty</p>
                <span className="text-lg font-bold">{donutCount}</span>
              </div>
            </div>
          </div>
        </div>
        <hr
          style={{
            background: "var(--border-border-primary, rgba(42, 42, 42, 1))",
          }}
          className="w-full border-t"
        />
        <div className="flex justify-between w-full ">
          <p className="text-xl text-secondary">Total</p>
          <div className="flex flex-col">
            <p className="text-xl font-bold">
              ${(donutCount * 1.0).toFixed(2)}
            </p>
            <p className="flex justify-end text-xs text-secondary">(+fee)</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col w-full gap-4 bg-primary-foreground p-4 rounded-3xl">
        <div className="flex w-10 h-10 items-center justify-center">
          <GiftSvg />
        </div>
        <p className="text-secondary text-base">Send to </p>
        <div className="relative w-full">
          <UserRound className="w-4 h-4 absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-500" />
          <Input
            type="text"
            placeholder="Type address"
            value={recipientAddress}
            onChange={(e) => setRecipient(e.target.value)}
            className="px-10 py-2 w-full rounded-s border h-16 bg-background"
          />
          <Copy className="w-4 h-4 absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-500" />
        </div>
      </div>
      <div className="flex gap-2 w-full">
        <button
          onClick={() => onViewChange("Checkout")}
          type="button"
          style={{
            border:
              "1px solid var(--border-border-secondary, rgba(79, 79, 79, 1))",
          }}
          className="flex flex-1 text-primary items-center justify-center border-secondary rounded-lg"
        >
          <p className="flex items-center">
            <ArrowLeft className="w-4 h-4" />
            Back
          </p>
        </button>
        <Button
          style={{
            background:
              "var(--foreground-foreground-accent-primary-010, rgba(9, 136, 240, 0.1))",
          }}
          disabled={!recipientAddress}
          onClick={handleCheckout}
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
            Checkout
          </p>
        </Button>
      </div>
    </div>
  );
}

export default CheckoutReceipentAddressView;
