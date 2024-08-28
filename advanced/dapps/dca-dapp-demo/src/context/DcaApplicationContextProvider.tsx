"use client";
import React, { createContext, useContext, ReactNode } from "react";
import {
  DCA_STRATERGIES,
  GRANTED_PERMISSIONS_KEY,
  removeItem,
  WC_COSIGNER_DATA,
} from "../utils/LocalStorage";
import { useLocalStorageState } from "../hooks/useLocalStorageState";
import { GrantPermissionsReturnType } from "viem/experimental";
import type { AddPermissionResponse } from "../utils/WalletConnectCosigner";
import { Chain } from "viem";
import {
  type Provider,
  useWagmiAvailableCapabilities,
} from "../hooks/useWagmiActiveCapabilities";
import { EIP_7715_RPC_METHODS } from "../utils/EIP5792Utils";
import { useAccount } from "wagmi";
import { DCAFormSchemaType } from "@/schema/DCAFormSchema";

type DCAStrategyMap = Record<string, DCAFormSchemaType[]>;

interface DcaApplicationContextType {
  projectId: string;
  provider: Provider | undefined;
  address: string | undefined;
  chain: Chain | undefined;
  isWalletConnected: boolean;
  isWalletConnecting: boolean;
  grantedPermissions: GrantPermissionsReturnType | undefined;
  setGrantedPermissions: React.Dispatch<
    React.SetStateAction<GrantPermissionsReturnType | undefined>
  >;
  clearGrantedPermissions: () => void;
  wcCosignerData: AddPermissionResponse | undefined;
  setWCCosignerData: React.Dispatch<
    React.SetStateAction<AddPermissionResponse | undefined>
  >;

  dcaStrategies: DCAFormSchemaType[];
  addDcaStrategy: (strategy: DCAFormSchemaType) => void;
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
  const { provider } = useWagmiAvailableCapabilities({
    method: EIP_7715_RPC_METHODS.WALLET_GRANT_PERMISSIONS,
  });
  const { chain, address, isConnected, status, isConnecting } = useAccount();

  const [grantedPermissions, setGrantedPermissions] = useLocalStorageState<
    GrantPermissionsReturnType | undefined
  >(GRANTED_PERMISSIONS_KEY, undefined);
  const [wcCosignerData, setWCCosignerData] = useLocalStorageState<
    AddPermissionResponse | undefined
  >(WC_COSIGNER_DATA, undefined);

  const isWalletConnecting =
    isConnecting || ["reconnecting", "connecting"].includes(status);
  const isWalletConnected =
    isConnected &&
    !isConnecting &&
    status === "connected" &&
    Boolean(provider) &&
    Boolean(chain) &&
    Boolean(address);

  function clearGrantedPermissions() {
    removeItem(GRANTED_PERMISSIONS_KEY);
    setGrantedPermissions(undefined);
  }
  const [allDcaStrategies, setAllDcaStrategies] = useLocalStorageState<
    DCAStrategyMap | undefined
  >(DCA_STRATERGIES, undefined);

  const dcaStrategies =
    address && isWalletConnected && allDcaStrategies
      ? allDcaStrategies[address]
      : [];

  function addDcaStrategy(strategy: DCAFormSchemaType) {
    if (address) {
      setAllDcaStrategies((prevStrategies) => {
        // Copy the existing strategies
        const updatedStrategies = { ...prevStrategies };

        // If the address already has strategies, append the new one
        if (updatedStrategies[address]) {
          updatedStrategies[address] = [
            ...updatedStrategies[address],
            strategy,
          ];
        } else {
          // Otherwise, create a new array for this address
          updatedStrategies[address] = [strategy];
        }

        return updatedStrategies;
      });
    }
  }

  return (
    <DcaApplicationContext.Provider
      value={{
        projectId,
        isWalletConnected,
        isWalletConnecting,
        provider,
        address,
        chain,
        grantedPermissions,
        wcCosignerData,
        dcaStrategies,
        addDcaStrategy,
        clearGrantedPermissions,
        setGrantedPermissions,
        setWCCosignerData,
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
