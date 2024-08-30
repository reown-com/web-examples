"use client";
import React from "react";
import { useAccount } from "wagmi";
import DCA from "@/components/DCA";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  const { status } = useAccount();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-sm text-center mb-12">
        <h1 className="text-3xl font-bold mb-4 text-gray-800 dark:text-gray-200">
          Dollor Cost Average
        </h1>

        {status === "connected" ? (
          <div className="flex w-full items-center justify-center">
            <w3m-button />
          </div>
        ) : (
          <p className="text-lg text-gray-600 dark:text-gray-400 font-bold">
            Connect wallet to create startegy.
          </p>
        )}

        <Tabs defaultValue="dca" className="w-[400px]">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dca">DCA</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          </TabsList>
          <TabsContent value="dca">
            <DCA walletConnected={status === "connected"} />
          </TabsContent>
          <TabsContent value="dashboard">
            <Dashboard />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
