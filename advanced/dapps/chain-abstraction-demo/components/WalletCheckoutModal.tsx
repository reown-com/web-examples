"use client";

import React from "react";
import { useSnapshot } from "valtio";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { walletCheckoutManager } from "../controllers/WalletCheckoutModalManager";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

export const WalletCheckoutModal: React.FC = () => {
  const snap = useSnapshot(walletCheckoutManager.getState());
  
  const handleClose = () => {
    walletCheckoutManager.close();
  };
  
  if (!snap.isOpen) return null;
  
  const CurrentView = snap.views[snap.currentView]?.component;
  
  if (!CurrentView) return null;
  
  return (
    <Dialog open={snap.isOpen} onOpenChange={handleClose}>
      <DialogContent 
        aria-describedby={undefined} 
        className="sm:max-w-[435px] bg-background"
      >
        <VisuallyHidden.Root asChild>
            <DialogTitle>Modal Title</DialogTitle>
          </VisuallyHidden.Root>
        <CurrentView 
          onClose={handleClose} 
          onViewChange={(viewKey) => walletCheckoutManager.switchView(viewKey)}
        />
      </DialogContent>
    </Dialog>
  );
};