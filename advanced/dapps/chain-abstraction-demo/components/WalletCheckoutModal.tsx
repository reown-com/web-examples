"use client";

import React from "react";
import { useSnapshot } from "valtio";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { walletCheckoutManager } from "../controllers/WalletCheckoutModalManager";

// Base Modal Wrapper
export const WalletCheckoutModal: React.FC = () => {
  const snap = useSnapshot(walletCheckoutManager.getState());
  
  const handleClose = () => {
    walletCheckoutManager.close();
  };
  
  if (!snap.isOpen) return null;
  
  const CurrentView = snap.views[snap.currentView]?.component;
  const title = snap.views[snap.currentView]?.title || "Checkout";
  
  if (!CurrentView) return null;
  
  return (
    <Dialog open={snap.isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <CurrentView 
          onClose={handleClose} 
          onViewChange={(viewKey) => walletCheckoutManager.switchView(viewKey)}
        />
      </DialogContent>
    </Dialog>
  );
};