"use client";

import * as React from "react";
import { Progress } from "@/components/ui/progress";
import { DCAFormSchemaType } from "@/schema/DCAFormSchema";
import { useDcaApplicationContext } from "@/context/DcaApplicationContextProvider";
import { calculateInterval } from "@/utils/DCAUtils";

export function DCAExecutionProgress({
  strategy,
}: {
  strategy: DCAFormSchemaType;
}) {
  const [progress, setProgress] = React.useState(0);
  const { grantedPermissions, wcCosignerData } = useDcaApplicationContext();
  const totalOrders = strategy.numberOfOrders;
  const intervalInMilliseconds = calculateInterval(
    strategy.investmentInterval,
    strategy.intervalUnit,
  );

  // Initialize nextExecutionTime to the current time plus the interval
  const [nextExecutionTime, setNextExecutionTime] = React.useState<number>(
    Date.now() + intervalInMilliseconds,
  );

  // Force re-render every second
  const [, setTick] = React.useState(0);

  // Calculate remaining orders based on progress
  const getRemainingOrders = React.useCallback(() => {
    const completedOrders = Math.floor((progress / 100) * totalOrders);
    return totalOrders - completedOrders;
  }, [progress, totalOrders]);

  // Format time remaining until next execution
  function formatTimeRemaining(time: number) {
    const seconds = Math.floor((time / 1000) % 60);
    const minutes = Math.floor((time / 1000 / 60) % 60);
    return `${minutes}m ${seconds}s`;
  }

  React.useEffect(() => {
    async function executeDCA() {
      // Increment progress immediately after initiating the API call
      setProgress((prev) => Math.min(prev + 100 / totalOrders, 100));

      try {
        await fetch("/api/dca/execute", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            strategy,
            permissions: grantedPermissions,
            pci: wcCosignerData?.pci,
          }),
        });
      } catch (error) {
        console.error("Error executing DCA:", error);
      }
    }

    const executionIntervalId = setInterval(() => {
      if (progress < 100 && getRemainingOrders() > 0) {
        executeDCA();
        setNextExecutionTime(Date.now() + intervalInMilliseconds);
      } else {
        clearInterval(executionIntervalId);
      }
    }, intervalInMilliseconds);

    return () => {
      clearInterval(executionIntervalId);
    };
  }, [
    progress,
    strategy,
    grantedPermissions,
    wcCosignerData,
    intervalInMilliseconds,
    totalOrders,
    getRemainingOrders,
  ]);

  React.useEffect(() => {
    const countdownIntervalId = setInterval(() => {
      setTick((tick) => tick + 1); // Force re-render every second
    }, 1000);

    return () => clearInterval(countdownIntervalId);
  }, []);

  return (
    <div className="flex flex-col w-full">
      <p className="text-xs sm:text-sm font-semibold mb-1 sm:mb-2">Executing Strategy...</p>
      <div className="flex items-center justify-between mb-1 sm:mb-2">
        <p className="text-xs sm:text-sm text-gray-700">
          Orders Left: <span className="font-bold">{getRemainingOrders()}</span>
        </p>
        {nextExecutionTime && getRemainingOrders() > 0 && (
          <p className="text-2xs sm:text-xs text-gray-500">
            Next: {formatTimeRemaining(nextExecutionTime - Date.now())}
          </p>
        )}
      </div>
      <Progress value={progress} className="w-full h-2 sm:h-3 bg-blue-200" />
    </div>
  );
}
