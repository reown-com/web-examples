import {
  giftDonutModalManager,
  GiftDonutModalViewProps,
} from "@/controllers/GiftDonutModalManager";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import GiftDonutModal from "./GiftDonutModal";
import { GiftDonutModalViews } from "./gift-donut-modal-views";

type GiftDonutModalTriggerProps = {
  views?: Record<string, React.FC<GiftDonutModalViewProps>>;
  initialView?: string;
  triggerText?: string;
  // Button customization props
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
  className,
  variant = "default",
  buttonProps = {},
}) => {
  const [isViewsRegistered, setIsViewsRegistered] = useState(false);

  useEffect(() => {
    // Register views
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

  return (
    <>
      <Button
        onClick={() => {
          if (isViewsRegistered) {
            giftDonutModalManager.open(initialView);
          } else {
            console.error("Views not yet registered");
          }
        }}
        variant={variant}
        className={className}
        {...buttonProps}
      >
        {triggerText}
      </Button>
      <GiftDonutModal />
    </>
  );
};
