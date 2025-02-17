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
  const selectedToken = giftDonutModalManager.getToken();
  const tokenSupportedNetworks = getSupportedNetworks(selectedToken.name);
  const { switchNetwork, caipNetwork } = useAppKitNetwork();

  // Initialize network state based on caipNetwork
  const [network, setNetwork] = React.useState<Network | undefined>(() => {
    const currentChainId = caipNetwork?.id;
    if (!currentChainId) return undefined;

    // Find the matching network from supported networks
    const matchingNetwork = supportedNetworks.find(
      (net) =>
        net.chainId === currentChainId &&
        tokenSupportedNetworks.includes(net.chainId),
    );

    // If found, set it in the modal manager
    if (matchingNetwork) {
      giftDonutModalManager.setNetwork(matchingNetwork);
    }

    return matchingNetwork;
  });

  const setSelectedNetwork = (network: Network) => {
    setNetwork(network);
    giftDonutModalManager.setNetwork(network);
    if (caipNetwork?.id !== network.chainId) {
      switchNetwork(network.chain);
      toast.info(
        `Switching Network from ${caipNetwork?.name || "current network"} to ${network.name}`,
      );
    }
  };

  // Filter supported networks
  const filteredNetworks = supportedNetworks.filter((network) =>
    tokenSupportedNetworks.includes(network.chainId),
  );

  return (
    <div className={cn("flex flex-col items-start gap-4", className)}>
      {filteredNetworks.map((networkItem, index) => (
        <div key={networkItem.chainId} className="w-full">
          <NetworkItem
            network={networkItem}
            selected={network?.chainId === networkItem.chainId}
            onClick={() => setSelectedNetwork(networkItem)}
            isCurrentNetwork={caipNetwork?.id === networkItem.chainId}
          />
          {index < filteredNetworks.length - 1 && <Separator />}
        </div>
      ))}
    </div>
  );
}

function NetworkItem({
  network,
  selected,
  onClick,
  isCurrentNetwork,
}: {
  network: Network;
  selected: boolean;
  onClick: () => void;
  isCurrentNetwork: boolean;
}) {
  return (
    <button
      className={cn(
        "w-full p-3 rounded-lg transition-colors",
        "hover:bg-primary-foreground/50",
        "flex items-center gap-3",
      )}
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
        <div className="flex flex-col items-start">
          <Label className="font-medium">{network.name}</Label>
          {isCurrentNetwork && (
            <span className="text-xs text-muted-foreground">
              Current Network
            </span>
          )}
        </div>
        {selected && <CheckIcon className="h-5 w-5 text-green-500" />}
      </div>
    </button>
  );
}

export default ChooseNetworkView;
