import * as React from "react";
import Image from "next/image";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { useAppKitAccount } from "@reown/appkit/react";

const Navbar = () => {
  const { status, address } = useAppKitAccount();
  return (
    <nav className="bg-foreground w-full border-b rounded-md md:border-0 my-4">
      <div className="flex items-center justify-between px-4 max-w-screen-xl mx-auto py-4 md:px-8">
        <div className="flex items-center gap-2">
          <Image src="/donut.png" alt="Gift Donut" width={40} height={40} />
          <h3 className="text-xl font-bold text-primary">Gift Donut</h3>
        </div>

        {status === "connected" || address ? (
          <div>
            <w3m-button balance="hide" />
          </div>
        ) : (
          <div>
            <ConnectWalletButton />
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
