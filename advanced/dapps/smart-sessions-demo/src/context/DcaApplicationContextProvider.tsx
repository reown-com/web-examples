"use client";
import React, { createContext, useContext, ReactNode } from "react";
import { DCA_APP_DATA, removeItem } from "../utils/LocalStorage";
import { useLocalStorageState } from "../hooks/useLocalStorageState";
import { DCAFormSchemaType } from "@/schema/DCAFormSchema";
import { SmartSessionGrantPermissionsResponse } from "@reown/appkit-experimental/smart-session";

interface DcaApplicationContextType {
  projectId: string;
  smartSession:
    | {
        grantedPermissions: SmartSessionGrantPermissionsResponse;
        dcaStrategy: DCAFormSchemaType;
      }
    | undefined;
  setSmartSession: React.Dispatch<
    React.SetStateAction<
      | {
          grantedPermissions: SmartSessionGrantPermissionsResponse;
          dcaStrategy: DCAFormSchemaType;
        }
      | undefined
    >
  >;
  clearSmartSession: () => void;
}

const DcaApplicationContext = createContext<
  DcaApplicationContextType | undefined
>(undefined);

export function DcaApplicationContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const projectId = process.env["NEXT_PUBLIC_PROJECT_ID"];
  if (!projectId) {
    throw new Error("NEXT_PUBLIC_PROJECT_ID is not set");
  }

  const [smartSession, setSmartSession] = useLocalStorageState<
    | {
        grantedPermissions: SmartSessionGrantPermissionsResponse;
        dcaStrategy: DCAFormSchemaType;
      }
    | undefined
  >(DCA_APP_DATA, undefined);

  function clearSmartSession() {
    removeItem(DCA_APP_DATA);
    setSmartSession(undefined);
  }

  return (
    <DcaApplicationContext.Provider
      value={{
        projectId,
        smartSession,
        clearSmartSession,
        setSmartSession,
      }}
    >
      {children}
    </DcaApplicationContext.Provider>
  );
}

export function useDcaApplicationContext() {
  const context = useContext(DcaApplicationContext);
  if (!context) {
    throw new Error(
      "useDcaApplicationContext must be used within a DcaApplicationContextProvider",
    );
  }

  return context;
}
