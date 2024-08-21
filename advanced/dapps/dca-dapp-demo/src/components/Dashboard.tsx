import React from "react";
import { useDcaApplicationContext } from "@/context/DcaApplicationContextProvider";
import {
  abi as donutAbi,
  address as donutAddress,
} from "@/utils/DonutContract";
import { useReadContract } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  const { address: accountAddress } = useDcaApplicationContext();
  const {
    data: donutsOwned,
    isLoading: donutsQueryLoading,
    isRefetching: donutsQueryRefetching,
  } = useReadContract({
    abi: donutAbi,
    address: donutAddress,
    functionName: "getBalance",
    args: [accountAddress],
    query: {
      refetchOnWindowFocus: false,
    },
  });

  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle className="text-center">Dashboard</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between border-b pb-2 mb-2">
          <p className="font-semibold">Asset</p>
          <p className="font-semibold">Balance</p>
        </div>
        <div className="flex justify-between items-center">
          <p>Donut</p>
          {donutsQueryLoading || donutsQueryRefetching ? (
            <p>...</p>
          ) : (
            <p>{donutsOwned?.toString()}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
