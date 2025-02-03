'use client'
import { BalanceDisplay } from "@/components/BalanceDisplay";
import { DonutImage } from "@/components/DonutImage";
import { DonutInfo } from "@/components/DonutInfo";
import { GiftDonutButton } from "@/components/GiftDonutButton";
import Navbar from "@/components/Navbar";
import { useWalletAssets } from "@/context/WalletAssetsProvider";
import { useAppKitAccount } from "@reown/appkit/react";
import React from "react";

const DONUT_PRICE = 1.00;

export default function Home() {
  const { status } = useAppKitAccount();
  const { balances, isLoading, getBalanceBySymbol } = useWalletAssets();

  const hasEnoughBalance = React.useMemo(() => {
    const usdcBalance = parseFloat(getBalanceBySymbol("USDC"));
    const usdtBalance = parseFloat(getBalanceBySymbol("USDT"));
    return (usdcBalance >= DONUT_PRICE) || (usdtBalance >= DONUT_PRICE);
  }, [getBalanceBySymbol]);


  return (
    <div className="sm:w-1/2 flex flex-col sm:mx-10">
      <Navbar />
      <div className="flex flex-col justify-center gap-4 mt-8">
        <DonutImage />
        <div className="flex flex-col gap-5 justify-end w-full">
          <div className="flex flex-col justify-between gap-4 w-full">
          <DonutInfo />
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col items-center">
                <p className="text-secondary">Price</p>
                <p className="font-bold text-primary">${DONUT_PRICE.toFixed(2)}</p>
            </div>
            <GiftDonutButton
              isConnected={status === "connected"}
              isLoading={isLoading}
              hasEnoughBalance={hasEnoughBalance}
            />
          </div>
          </div>
          {status === "connected" && (
              <BalanceDisplay 
                balances={balances}
                isLoading={isLoading}
              />
            )}
        </div>
      </div>
    </div>
  );
}