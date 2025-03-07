"use client";

import * as React from "react";
import { Progress } from "@/components/ui/progress";
import { DCAFormSchemaType } from "@/schema/DCAFormSchema";
import { useDcaApplicationContext } from "@/context/DcaApplicationContextProvider";
import { calculateInterval } from "@/utils/DCAUtils";
import { toast } from "sonner";

interface DCAExecutionProgressProps {
  strategy: DCAFormSchemaType;
  toastId?: string | number;
}

export function DCAExecutionProgress({
  strategy,
  toastId,
}: DCAExecutionProgressProps) {
  const [progress, setProgress] = React.useState(0);
  const { smartSession, clearSmartSession } = useDcaApplicationContext();
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

  // Flag to track if all orders have been processed
  const [allOrdersCompleted, setAllOrdersCompleted] = React.useState(false);

  // Calculate remaining orders based on progress
  const getRemainingOrders = React.useCallback(() => {
    const completedOrders = Math.floor((progress / 100) * totalOrders);
    return totalOrders - completedOrders;
  }, [progress, totalOrders]);

  // Format time remaining until next execution
  function formatTimeRemaining(time: number) {
    // Prevent negative times
    if (time <= 0) {
      return "executing now...";
    }

    const seconds = Math.floor((time / 1000) % 60);
    const minutes = Math.floor((time / 1000 / 60) % 60);
    return `${minutes}m ${seconds}s`;
  }

  React.useEffect(() => {
    async function executeDCA() {
      // If smartSession is undefined, close the component and dismiss toast
      if (!smartSession) {
        setAllOrdersCompleted(true);
        setShouldClose(true);

        return;
      }

      try {
        // Set status to executing
        setNextExecutionTime(0); // This will show "executing now..."

        fetch("/api/dca/execute", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            strategy,
            permissions: smartSession?.grantedPermissions,
          }),
        });

        // Increment progress after API call completes
        setProgress((prev) => {
          const newProgress = Math.min(prev + 100 / totalOrders, 100);

          // Check if we've reached 100% progress
          if (newProgress >= 100) {
            setAllOrdersCompleted(true);
          }

          return newProgress;
        });

        // Reset next execution time
        if (getRemainingOrders() > 1) {
          // -1 to account for the order we just executed
          setNextExecutionTime(Date.now() + intervalInMilliseconds);
        }
      } catch (error) {
        console.error("Error executing DCA:", error);
      }
    }

    const executionIntervalId = setInterval(() => {
      if (progress < 100 && getRemainingOrders() > 0) {
        executeDCA();
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
    smartSession?.grantedPermissions,
    intervalInMilliseconds,
    totalOrders,
    getRemainingOrders,
  ]);

  // Check if smartSession is undefined when the component mounts
  React.useEffect(() => {
    if (!smartSession) {
     // Also dismiss the toast when the session disappears
      if (toastId) {
        toast.dismiss(toastId);
      }
      setShouldClose(true);
    }
  }, [smartSession]);

  // Track if component should close itself
  const [shouldClose, setShouldClose] = React.useState(false);

  // Clear smart session when all orders are completed
  React.useEffect(() => {
    if (allOrdersCompleted && clearSmartSession) {
      // Add a small delay to ensure the last order has been processed
      const clearTimer = setTimeout(() => {
        clearSmartSession();
        console.log("Smart session cleared after all DCA orders completed");

        // Signal that the component should close after a brief display period
        const closeTimer = setTimeout(() => {
          // Explicitly dismiss the toast using its ID
          if (toastId) {
            toast.dismiss(toastId);
          }
          setShouldClose(true);
        }, 2000); // Show success message for 2 seconds before closing

        return () => clearTimeout(closeTimer);
      }, 1000);

      return () => clearTimeout(clearTimer);
    }
  }, [allOrdersCompleted, clearSmartSession]);

  React.useEffect(() => {
    const countdownIntervalId = setInterval(() => {
      setTick((tick) => tick + 1); // Force re-render every second
    }, 1000);

    return () => clearInterval(countdownIntervalId);
  }, []);

  // If shouldClose is true, return null to close the component
  if (shouldClose) {
    return null;
  }

  return (
    <div className="flex flex-col w-full">
      <h3 className="text-lg font-semibold mb-2">Executing the Strategy...</h3>
      <p className="text-gray-700 mb-4">
        Orders Remaining:{" "}
        <span className="font-bold">{getRemainingOrders()}</span>
      </p>
      <Progress value={progress} className="w-full h-4 bg-blue-200" />
      {nextExecutionTime > 0 && getRemainingOrders() > 0 ? (
        <p className="mt-2 text-sm text-gray-500">
          Executing in {formatTimeRemaining(nextExecutionTime - Date.now())}
        </p>
      ) : getRemainingOrders() > 0 ? (
        <p className="mt-2 text-sm text-gray-500">Executing order now...</p>
      ) : null}
      {allOrdersCompleted && (
        <p className="mt-2 text-sm text-green-500 font-medium">
          All orders completed successfully! Closing...
        </p>
      )}
    </div>
  );
}
