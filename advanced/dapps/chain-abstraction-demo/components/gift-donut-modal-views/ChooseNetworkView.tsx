import { Network, supportedNetworks } from "@/data/EIP155Data";
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
import { useAppKitNetwork } from "@reown/appkit/react";
import { toast } from "sonner";
import { getSupportedNetworks } from "@/consts/tokens";

function ChooseNetworkView({ onViewChange, onClose }: GiftDonutModalViewProps) {
  return (
    <div className={cn("flex flex-col items-start gap-4 text-primary")}>
      <div className="grid grid-cols-3 items-center w-full">
        <div className="flex justify-start">
          <Button variant="ghost" onClick={() => onViewChange("Checkout")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
        <div className="col-end-3 text-center">
          <h1>Choose network</h1>
        </div>
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <NetworkList className="w-full" />
    </div>
  );
}

function NetworkList({ className }: React.ComponentProps<"form">) {
  const selectedNetwork = giftDonutModalManager.getNetwork();
  const selectedToken = giftDonutModalManager.getToken();
  const tokenSupportedNetworks = getSupportedNetworks(selectedToken.name);

  const { switchNetwork, caipNetwork } = useAppKitNetwork();
  const [network, setNetwork] = React.useState<Network | undefined>(
    selectedNetwork
  );

  const setSelectedNetwork = (network: Network) => {
    setNetwork(network);
    giftDonutModalManager.setNetwork(network);
    if (caipNetwork?.id !== network.chainId) {
      switchNetwork(network.chain);
      toast.info(
        "Switching Network from " + caipNetwork?.name + " to " + network.name
      );
    }
  };

  return (
    <div className={cn("flex flex-col items-start gap-4", className)}>
      {supportedNetworks
        .filter((network) => tokenSupportedNetworks.includes(network.chainId))
        .map((networkItem, index) => (
          <div key={index} className="flex items-center flex-col gap-4 w-full">
            <NetworkItem
              network={networkItem}
              selected={network?.chainId === networkItem.chainId}
              onClick={() => setSelectedNetwork(networkItem)}
            />
            {supportedNetworks.length - 1 !== index && <Separator />}
          </div>
        ))}
    </div>
  );
}

function NetworkItem({
  network,
  selected,
  onClick,
}: {
  network: Network;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className="flex w-full items-center gap-2 cursor-pointer"
      onClick={onClick}
    >
      <div className="w-10 h-10 rounded-full flex items-center justify-center">
        <Image
          src={network.icon}
          alt={network.name}
          width={40}
          height={40}
          className="rounded-full"
        />
      </div>
      <div className="flex flex-1 items-center justify-between">
        <Label>{network.name}</Label>
        <div>{selected && <CheckIcon color="green" />}</div>
      </div>
    </div>
  );
}

export default ChooseNetworkView;
