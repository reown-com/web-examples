import React, { useMemo } from "react";
import { useForm, Control, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { dcaFormSchema, DCAFormSchemaType } from "@/schema/DCAFormSchema";
import { useDCA } from "@/hooks/useDCA";
import { useAppKitAccount } from "@reown/appkit/react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { DCAExecutionProgress } from "@/components/DcaComponents/DCAExecutionProgress";
import { ArrowUpDown, Loader2 } from "lucide-react";
import { calculateInterval } from "@/utils/DCAUtils";
import AssetAllocationField from "./AssetAllocationField";
import AssetToBuyField from "./AssetToBuyField";
import InvestmentIntervalField from "./InvestmentIntervalField";
import NumberOfOrdersField from "./NumberOfOrdersField";
import { isSmartSessionSupported } from "@reown/appkit-experimental/smart-session";

export interface FieldProps {
  control: Control<DCAFormSchemaType>;
  errors: FieldErrors<DCAFormSchemaType>;
}

function DCAForm() {
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
  const { address, status } = useAppKitAccount();
  const { createNewDCAStrategy } = useDCA();
  const [isLoading, setLoading] = React.useState(false);
  const isSupported = useMemo(
    () => isSmartSessionSupported(),
    [status, address],
  );

  const isWalletConnecting =
    status === "connecting" || status === "reconnecting";

  async function onSubmit(data: DCAFormSchemaType) {
    try {
      setLoading(true);
      const strategyWithTimestamp = {
        ...data,
        createdTimestamp: Date.now() + 500,
      };

      await createNewDCAStrategy(strategyWithTimestamp);

      const intervalInMilliseconds = calculateInterval(
        strategyWithTimestamp.investmentInterval,
        strategyWithTimestamp.intervalUnit,
      );

      const expirationTime =
        strategyWithTimestamp.createdTimestamp +
        intervalInMilliseconds * strategyWithTimestamp.numberOfOrders;

      toast(
        <DCAExecutionProgress
          strategy={strategyWithTimestamp}
          key={Date.now()}
        />,
        { duration: expirationTime - strategyWithTimestamp.createdTimestamp },
      );
    } catch (e) {
      toast("Error", {
        description: (e as Error)?.message || "Error creating DCA strategy",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardDescription>Set Dollar cost average strategy</CardDescription>
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
        <CardFooter>
          {isWalletConnecting ? (
            <Button className="w-full bg-blue-500 hover:bg-blue-700" disabled>
              Reconnecting Wallet...
            </Button>
          ) : status !== "connected" && !address ? (
            <ConnectWalletButton />
          ) : !isSupported ? (
            <Button className="w-full bg-blue-500 hover:bg-blue-700" disabled>
              Unsupported Wallet
            </Button>
          ) : (
            <Button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-700"
            >
              {isLoading ? (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              ) : (
                "Create"
              )}
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}

export default DCAForm;
