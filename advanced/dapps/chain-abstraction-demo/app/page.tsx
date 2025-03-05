"use client";

import * as React from "react";
import Image from "next/image";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { useAppKitAccount } from "@reown/appkit/react";
import Navbar from "@/components/Navbar";
import { GiftDonutModalTrigger } from "@/components/GiftDonutModalTrigger";
import { useWalletCheckout } from "@/hooks/useWalletCheckout";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { status, address } = useAppKitAccount();
  const { isWalletCheckoutSupported } = useWalletCheckout();
  return (
    <div className="sm:w-1/2 flex flex-col sm:mx-10">
      <Navbar />
      <div className="flex flex-col justify-center gap-4 mt-8">
        <div className="flex items-center justify-center h-64 relative ">
          <Image
            src="/donut-cover.png"
            alt="Gift Donut"
            className="object-cover"
            fill={true}
          />
        </div>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col text-left">
            <p className=" font-bold text-primary">Donut #1</p>
            <p className=" text-secondary">Lorem ipsum dolor sit...</p>
          </div>
          <div className="flex justify-between items-center w-full">
            <div className="flex flex-col text-left">
              <p className=" text-secondary">Price</p>
              <p className=" font-bold text-primary">$1.00</p>
            </div>
            {status === "connected" || address ? (
              isWalletCheckoutSupported ? (
                <Button>Checkout</Button>
              ) : (
                <div>
                  <GiftDonutModalTrigger
                    triggerText="Gift Donut"
                    initialView="Checkout"
                    className="bg-blue-500 hover:bg-blue-700 text-invert"
                  />
                </div>
              )
            ) : (
              <div>
                <ConnectWalletButton />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
