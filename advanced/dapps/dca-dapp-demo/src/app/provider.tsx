import React from "react";
import { DcaApplicationContextProvider } from "../context/DcaApplicationContextProvider";
import { AppKitProvider } from "../context/AppKitProvider";
import { Toaster } from "@/components/ui/sonner";

export default function Provider({ children }: { children: React.ReactNode }) {
  return (
    <AppKitProvider>
      <DcaApplicationContextProvider>
        {children}
        <Toaster expand={true} />
      </DcaApplicationContextProvider>
    </AppKitProvider>
  );
}
