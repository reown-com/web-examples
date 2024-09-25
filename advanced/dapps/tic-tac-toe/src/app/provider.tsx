import React from "react";
import { AppKitProvider } from "../context/AppKitProvider";
import { Toaster } from "@/components/ui/sonner";
import { TicTacToeContextProvider } from "@/context/TicTacToeContextProvider";

export default function Provider({ children }: { children: React.ReactNode }) {
  return (
    <AppKitProvider>
      <TicTacToeContextProvider>
        {children}
        <Toaster expand={true} />
      </TicTacToeContextProvider>
    </AppKitProvider>
  );
}
