import {
  giftDonutModalManager,
  GiftDonutModalViewProps,
} from "@/controllers/GiftDonutModalManager";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import GiftDonutModal from "./GiftDonutModal";
import { GiftDonutModalViews } from "./gift-donut-modal-views";
import { useWalletGetAssets } from "@/context/WalletAssetsProvider";
import { useAppKitNetwork } from "@reown/appkit/react";
import { supportedNetworks } from "@/data/EIP155Data";

type GiftDonutModalTriggerProps = {
  views?: Record<string, React.FC<GiftDonutModalViewProps>>;
  initialView?: string;
  triggerText?: string | React.ReactElement;
  disabled?: boolean;
  className?: string;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  buttonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
};

export const GiftDonutModalTrigger: React.FC<GiftDonutModalTriggerProps> = ({
  views = GiftDonutModalViews,
  initialView = "Checkout",
  triggerText = "Gift Donut",
  disabled = false,
  className,
  variant = "default",
  buttonProps = {},
}) => {
  const [isViewsRegistered, setIsViewsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { fetchBalances } = useWalletGetAssets();
  const { caipNetwork } = useAppKitNetwork();

  useEffect(() => {
    Object.entries(views).forEach(([key, component]) =>
      giftDonutModalManager.registerView(key, {
        component,
        title: key,
      }),
    );

    setIsViewsRegistered(true);

    return () => {
      Object.keys(views).forEach((key) =>
        giftDonutModalManager.unregisterView(key),
      );
    };
  }, [views]);

  const handleOpenModal = async () => {
    if (!isViewsRegistered) {
      console.error("Views not yet registered");
      return;
    }

    setIsLoading(true);

    try {
      // Set initial network based on current CAIP network
      if (caipNetwork?.id) {
        const currentNetwork = supportedNetworks.find(
          (net) => net.chainId === caipNetwork.id,
        );
        if (currentNetwork) {
          giftDonutModalManager.setNetwork(currentNetwork);
        }
      }

      const balances = await fetchBalances();
      giftDonutModalManager.setBalances(balances);
    } catch (error) {
      console.error("Failed to fetch balances:", error);
    } finally {
      setIsLoading(false);
      giftDonutModalManager.open(initialView);
    }
  };

  return (
    <>
      <Button
        onClick={handleOpenModal}
        variant={variant}
        className={className}
        disabled={disabled || isLoading}
        {...buttonProps}
      >
        {isLoading ? "Loading..." : triggerText}
      </Button>
      <GiftDonutModal />
    </>
  );
};
