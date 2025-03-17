import React from "react";
import { Button } from "../ui/button";
import { RefreshCcw } from "lucide-react";

interface AssetBalanceProps {
  assetName: string;
  balance: string | undefined;
  isLoading: boolean;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  refetch: Function;
}

export default function AssetBalance({
  assetName,
  balance,
  isLoading,
  refetch,
}: AssetBalanceProps) {
  return (
    <>
      <div className="flex justify-between border-b pb-2">
        <p className="font-semibold">Asset</p>
        <p className="font-semibold">Balance</p>
      </div>
      <div className="flex justify-between items-center">
        <p>{assetName}</p>
        {isLoading ? (
          <p>...</p>
        ) : (
          <p>
            {balance}
            <Button
              className="ml-2"
              variant="outline"
              size="icon"
              onClick={() => refetch()}
            >
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </p>
        )}
      </div>
    </>
  );
}
