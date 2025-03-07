import React from "react";
import { useForm, Control, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { dcaFormSchema, DCAFormSchemaType } from "@/schema/DCAFormSchema";
import { useDCA } from "@/hooks/useDCA";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DCAExecutionProgress } from "@/components/DcaComponents/DCAExecutionProgress";
import { ArrowUpDown, Loader2, RefreshCw } from "lucide-react";
import AssetAllocationField from "./AssetAllocationField";
import AssetToBuyField from "./AssetToBuyField";
import InvestmentIntervalField from "./InvestmentIntervalField";
import NumberOfOrdersField from "./NumberOfOrdersField";
import { useDcaApplicationContext } from "@/context/DcaApplicationContextProvider";

export interface FieldProps {
  control: Control<DCAFormSchemaType>;
  errors: FieldErrors<DCAFormSchemaType>;
}

interface DCAFormProps {
  isSupported: boolean;
  hasInsufficientEth?: boolean;
}

function DCAForm({ isSupported, hasInsufficientEth }: DCAFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<DCAFormSchemaType>({
    resolver: zodResolver(dcaFormSchema),
    defaultValues: {
      assetToAllocate: "eth",
      assetToBuy: "donut",
      intervalUnit: "minute",
      allocationAmount: 0,
      investmentInterval: 0,
      numberOfOrders: 0,
    },
  });

  const { createNewDCAStrategy } = useDCA();
  const [isLoading, setLoading] = React.useState(false);
  const { smartSession, clearSmartSession } = useDcaApplicationContext();

  // Check if there's an active strategy running
  const hasActiveStrategy = !!smartSession;

  // Store active toast IDs
  const [activeToastIds, setActiveToastIds] = React.useState<
    (string | number)[]
  >([]);

  // Effect to clean up toasts and reset loading state if smartSession becomes undefined
  React.useEffect(() => {
    if (!smartSession) {
      // Reset loading state to ensure button text updates
      setLoading(false);

      // Dismiss all active DCA execution toasts
      if (activeToastIds.length > 0) {
        activeToastIds.forEach((id) => {
          toast.dismiss(id);
        });
        // Clear the list
        setActiveToastIds([]);
      }
    }
  }, [smartSession, activeToastIds]);

  async function onSubmit(data: DCAFormSchemaType) {
    try {
      setLoading(true);
      const strategyWithTimestamp = {
        ...data,
        createdTimestamp: Date.now() + 500,
      };

      await createNewDCAStrategy(strategyWithTimestamp);

      // Generate a unique ID for this toast before creating it
      const uniqueToastId = `dca-toast-${Date.now()}`;

      // Create toast with the predetermined ID
      toast(
        <DCAExecutionProgress
          strategy={strategyWithTimestamp}
          toastId={uniqueToastId}
          key={Date.now()}
        />,
        {
          id: uniqueToastId,
          duration: Infinity,
        },
      );

      // Store the toast ID
      setActiveToastIds((prev) => [...prev, uniqueToastId]);
    } catch (e) {
      toast("Error", {
        description: (e as Error)?.message || "Error creating DCA strategy",
      });
    } finally {
      setLoading(false);
    }
  }

  // Handle clearing the smart session
  const handleClearStrategy = () => {
    if (clearSmartSession) {
      // Set loading to false to update button state immediately
      setLoading(false);
      clearSmartSession();
      toast.success("Strategy cleared successfully");
    }
  };

  // Check if the Create button should be shown
  const canCreateStrategy =
    isSupported && !hasInsufficientEth && !hasActiveStrategy;

  return (
    <Card>
      <CardHeader>
        <CardDescription>Set DCA Strategy</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <AssetAllocationField control={control} errors={errors} />
          <Button variant="outline" size="icon" disabled>
            <ArrowUpDown className="h-4 w-4" />
          </Button>
          <AssetToBuyField control={control} errors={errors} />
          <InvestmentIntervalField control={control} errors={errors} />
          <NumberOfOrdersField control={control} errors={errors} />
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          {/* Always show Create button, but disable it when conditions aren't met */}
          <Button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-700"
            disabled={!canCreateStrategy || isLoading}
          >
            {isLoading ? (
              <>
                Creating Strategy
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              </>
            ) : !isSupported ? (
              "Unsupported Wallet"
            ) : hasInsufficientEth ? (
              "Insufficient ETH"
            ) : hasActiveStrategy ? (
              "Executing Strategy..."
            ) : (
              "Create"
            )}
          </Button>

          {/* Clear strategy button - always visible but conditionally enabled */}
          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={handleClearStrategy}
            disabled={!hasActiveStrategy}
          >
            <RefreshCw className="h-4 w-4" />
            Clear Strategy
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export default DCAForm;
