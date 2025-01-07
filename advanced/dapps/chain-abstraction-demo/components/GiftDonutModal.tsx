"use client";
import React, { useCallback, useMemo } from "react";
import { useSnapshot } from "valtio";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { giftDonutModalManager } from "@/controllers/GiftDonutModalManager";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Drawer, DrawerContent, DrawerTitle } from "./ui/drawer";

const GiftDonutModal: React.FC = () => {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const state = useSnapshot(giftDonutModalManager.getState());

  const CurrentView = useMemo(() => {
    const viewDefinition = state.views[state.currentView];
    return viewDefinition ? viewDefinition.component : null;
  }, [state.currentView, state.views]);

  const handleClose = useCallback(() => {
    giftDonutModalManager.close();
  }, []);

  const handleViewChange = useCallback((viewKey: string) => {
    giftDonutModalManager.switchView(viewKey);
  }, []);

  if (isDesktop) {
    return (
      <Dialog open={state.isOpen}>
        <DialogContent
          aria-describedby={undefined}
          className="sm:max-w-[435px] bg-background"
        >
          <VisuallyHidden.Root asChild>
            <DialogTitle>Modal Title</DialogTitle>
          </VisuallyHidden.Root>
          {CurrentView && (
            <CurrentView
              onClose={handleClose}
              onViewChange={handleViewChange}
            />
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={state.isOpen}>
      <VisuallyHidden.Root asChild>
        <DrawerTitle>Modal Title</DrawerTitle>
      </VisuallyHidden.Root>
      <DrawerContent aria-describedby={undefined} className="bg-background p-4">
        {CurrentView && (
          <CurrentView onClose={handleClose} onViewChange={handleViewChange} />
        )}
      </DrawerContent>
    </Drawer>
  );
};

export default GiftDonutModal;
