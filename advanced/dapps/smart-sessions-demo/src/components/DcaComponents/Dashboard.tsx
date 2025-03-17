import React from "react";
import { useDcaApplicationContext } from "@/context/DcaApplicationContextProvider";
import {
  abi as donutAbi,
  address as donutAddress,
} from "@/utils/DonutContract";
import { useReadContract } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AddressDisplay from "./AddressDisplay";
import AssetBalance from "./AssetBalance";
import { useAppKitAccount } from "@reown/appkit/react";

export default function Dashboard() {
  const { smartSession } = useDcaApplicationContext();
  const { address: connectedAddress } = useAppKitAccount();
  const lastAddress = smartSession?.grantedPermissions
    ? smartSession?.grantedPermissions.address
    : connectedAddress;

  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle className="text-center">Dashboard</CardTitle>
      </CardHeader>
      <CardContent>
        {lastAddress ? (
          <DashboardContent address={lastAddress} />
        ) : (
          <EmptyDashboardContent />
        )}
      </CardContent>
    </Card>
  );
}

function DashboardContent({ address }: { address: string }) {
  const {
    data: donutsOwned,
    isLoading: donutsQueryLoading,
    isRefetching: donutsQueryRefetching,
    refetch,
  } = useReadContract({
    abi: donutAbi,
    address: donutAddress,
    functionName: "getBalance",
    args: [address],
    query: {
      refetchOnWindowFocus: false,
    },
  });

  return (
    <div className="flex flex-col space-y-4">
      <AddressDisplay address={address} />
      <AssetBalance
        assetName="Donut"
        balance={donutsOwned?.toString()}
        isLoading={donutsQueryLoading || donutsQueryRefetching}
        refetch={refetch}
      />
    </div>
  );
}

function EmptyDashboardContent() {
  return <p className="text-center">No address found</p>;
}
