import React from "react";

interface AssetBalanceProps {
  assetName: string;
  balance: string | undefined;
  isLoading: boolean;
}

export default function AssetBalance({
  assetName,
  balance,
  isLoading,
}: AssetBalanceProps) {
  return (
    <>
      <div className="flex justify-between border-b pb-2">
        <p className="font-semibold">Asset</p>
        <p className="font-semibold">Balance</p>
      </div>
      <div className="flex justify-between items-center">
        <p>{assetName}</p>
        {isLoading ? <p>...</p> : <p>{balance}</p>}
      </div>
    </>
  );
}
