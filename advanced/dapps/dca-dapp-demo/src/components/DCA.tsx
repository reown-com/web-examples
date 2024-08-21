import React, { useState } from "react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { DCAExecutionProgress } from "@/components/DCAExecutionProgress";
import { zodResolver } from "@hookform/resolvers/zod";
import { dcaFormSchema, DCAFormSchemaType } from "@/schema/DCAFormSchema";
import { useDCA } from "@/hooks/useDCA";
import {
  assetsToBuy,
  assetsToAllocate,
  intervalOptions,
  calculateInterval,
} from "@/utils/DCAUtils";
import { useForm, Controller } from "react-hook-form";
import { ArrowUpDown, Loader2 } from "lucide-react";
import { useDcaApplicationContext } from "@/context/DcaApplicationContextProvider";
import { toast } from "sonner";

function DCA({ walletConnected }: { walletConnected: boolean }) {
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
    },
  });
  const { isWalletConnecting } = useDcaApplicationContext();
  const { createNewDCAStrategy } = useDCA();
  const [isLoading, setLoading] = useState(false);

  async function onSubmit(data: DCAFormSchemaType) {
    try {
      setLoading(true);
      // Add the createdTimestamp to the form data
      const strategyWithTimestamp = {
        ...data,
        createdTimestamp: Date.now() + 500,
      };

      // Pass the data with the timestamp to your function
      await createNewDCAStrategy(strategyWithTimestamp);

      const intervalInMilliseconds = calculateInterval(
        strategyWithTimestamp.investmentInterval,
        strategyWithTimestamp.intervalUnit,
      );

      const expirationTime =
        strategyWithTimestamp.createdTimestamp +
        intervalInMilliseconds * strategyWithTimestamp.numberOfOrders;
      console.log({ expirationTime });
      console.log({
        duration: expirationTime - strategyWithTimestamp.createdTimestamp,
      });

      toast(
        <DCAExecutionProgress
          strategy={strategyWithTimestamp}
          key={Date.now()}
        />,
        {
          duration: expirationTime - strategyWithTimestamp.createdTimestamp,
        },
      );
    } catch (e) {
      const errorMessage =
        (e as Error)?.message || "Error creating DCA strategy";
      toast("Error", {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardDescription>Set Dollar cost average strategy</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-2">
            <div className="flex flex-col gap-4 items-center">
              <div className={`grid w-full max-w-sm gap-1.5 `}>
                <div
                  className={`grid max-w-sm items-center gap-1.5 rounded-lg p-4 bg-blue-200 focus-within:ring-2 focus-within:border-blue-500 ${
                    errors.assetToAllocate ? "border-2 border-red-500" : ""
                  }`}
                >
                  <Label className="flex" htmlFor="assetToAllocate">
                    I Want To Allocate
                  </Label>
                  <div className="flex w-full max-w-sm items-center space-x-2">
                    <Controller
                      name="assetToAllocate"
                      control={control}
                      render={({ field }) => {
                        const selectedOption = assetsToAllocate.find(
                          (option) => option.value === field.value,
                        );

                        return (
                          <Select
                            {...field}
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <SelectTrigger
                              className={`w-[180px] text-lg border-none bg-blue-200 focus:outline-none focus:ring-0 focus:ring-offset-0 ${
                                errors.assetToAllocate
                                  ? "border-2 border-red-500"
                                  : ""
                              }`}
                            >
                              <SelectValue>
                                {selectedOption
                                  ? selectedOption.label
                                  : "Select asset"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {assetsToAllocate.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                    disabled={!option.supported}
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        );
                      }}
                    />
                    <Controller
                      name="allocationAmount"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="number"
                          placeholder="0.00"
                          className={`border-none text-lg no-arrows bg-transparent text-right focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ${
                            errors.allocationAmount
                              ? "border-2 border-red-500"
                              : ""
                          }`}
                        />
                      )}
                    />
                  </div>
                </div>
                {/* Ensure the error message is outside the main div and aligned to the left */}
                {errors.allocationAmount && (
                  <div className="w-full text-left">
                    <p className="text-red-500 text-sm">
                      {errors.allocationAmount.message}
                    </p>
                  </div>
                )}
              </div>
              <Button variant="outline" size="icon" disabled>
                <ArrowUpDown className="h-4 w-4" />
              </Button>
              <div className={`grid w-full max-w-sm gap-1.5 `}>
                <div
                  className={`grid max-w-sm items-center gap-1.5 rounded-lg p-4 bg-blue-200 focus-within:ring-2 focus-within:border-blue-500 ${
                    errors.assetToBuy ? "border-2 border-red-500" : ""
                  }`}
                >
                  <Label className="flex" htmlFor="assetToBuy">
                    To Buy
                  </Label>
                  <div className="flex w-full max-w-sm items-center space-x-2">
                    <Controller
                      name="assetToBuy"
                      control={control}
                      render={({ field }) => {
                        // Find the selected option's label based on the current value
                        const selectedOption = assetsToBuy.find(
                          (option) => option.value === field.value,
                        );

                        return (
                          <Select
                            {...field}
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <SelectTrigger
                              className={`w-full text-lg border-none bg-transparent focus:outline-none focus:ring-0 focus:ring-offset-0 ${
                                errors.assetToBuy
                                  ? "border-2 border-red-500"
                                  : ""
                              }`}
                            >
                              <SelectValue>
                                {selectedOption
                                  ? selectedOption.label
                                  : "Select asset"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {assetsToBuy.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                    disabled={!option.supported}
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        );
                      }}
                    />
                  </div>
                </div>
                {errors.assetToBuy && (
                  <div className="w-full text-left">
                    <p className="text-red-500 text-sm">
                      {errors.assetToBuy.message}
                    </p>
                  </div>
                )}
              </div>

              <div className={`grid w-full max-w-sm items-center gap-1.5 `}>
                <Label className="flex" htmlFor="investmentInterval">
                  Every
                </Label>
                <div className="flex w-full max-w-sm items-center align-center space-x-2">
                  <div className="flex flex-col">
                    <div className="flex w-full max-w-sm items-center align-center space-x-2">
                      <Controller
                        name="investmentInterval"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            type="number"
                            placeholder="0"
                            className={`border-none bg-blue-200 text-lg no-arrows text-left focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ${
                              errors.investmentInterval
                                ? "border-2 border-red-500"
                                : ""
                            }`}
                          />
                        )}
                      />
                      <Controller
                        name="intervalUnit"
                        control={control}
                        render={({ field }) => {
                          // Find the selected option's label based on the current value
                          const selectedOption = intervalOptions.find(
                            (option) => option.value === field.value,
                          );

                          return (
                            <Select
                              {...field}
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <SelectTrigger
                                className={`w-[180px] text-lg border-none bg-blue-200 focus:outline-none focus:ring-0 focus:ring-offset-0 ${
                                  errors.intervalUnit
                                    ? "border-2 border-red-500"
                                    : ""
                                }`}
                              >
                                <SelectValue>
                                  {selectedOption
                                    ? selectedOption.label
                                    : "Select interval"}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  {intervalOptions.map((option) => (
                                    <SelectItem
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          );
                        }}
                      />
                    </div>
                    <div className="flex w-full max-w-sm items-center align-center space-x-2">
                      {errors.investmentInterval ? (
                        <div className="flex justify-start">
                          <p className="text-red-500 text-sm">
                            {errors.investmentInterval.message}
                          </p>
                        </div>
                      ) : (
                        <div></div>
                      )}
                    </div>
                    {errors.intervalUnit ? (
                      <div className="flex justify-start">
                        <p className="text-red-500 text-sm">
                          {errors.intervalUnit.message}
                        </p>
                      </div>
                    ) : (
                      <div></div>
                    )}
                  </div>
                </div>
              </div>

              <div className={`grid w-full max-w-sm items-center gap-1.5 `}>
                <Label className="flex" htmlFor="numberOfOrders">
                  Over
                </Label>
                <div
                  className={`flex w-full max-w-sm items-center rounded-lg justify-between space-x-2 bg-blue-200 ${
                    errors.numberOfOrders ? "border-2 border-red-500" : ""
                  }`}
                >
                  <Controller
                    name="numberOfOrders"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="number"
                        placeholder="0"
                        className={`border-none bg-transparent text-lg no-arrows text-left focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ${
                          errors.numberOfOrders
                            ? "border-2 border-red-500 "
                            : ""
                        }`}
                      />
                    )}
                  />
                  <Label className="flex pr-2" htmlFor="orders">
                    orders
                  </Label>
                </div>
                {errors.numberOfOrders && (
                  <div className="flex justify-start">
                    <p className="text-red-500 text-sm">
                      {errors.numberOfOrders.message}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          {walletConnected && !isWalletConnecting && (
            <CardFooter>
              <div className="flex flex-col w-full gap-2">
                <Button
                  type="submit"
                  className="w-full bg-blue-500 hover:bg-blue-700"
                >
                  <>
                    {isLoading ? (
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    ) : (
                      "Create"
                    )}
                  </>
                </Button>
              </div>
            </CardFooter>
          )}
        </form>
        {isWalletConnecting ? (
          <CardFooter>
            <Button className="w-full bg-blue-500 hover:bg-blue-700" disabled>
              {`Reconnecting Wallet... `}
            </Button>
          </CardFooter>
        ) : (
          !walletConnected && (
            <CardFooter>
              <ConnectWalletButton />
            </CardFooter>
          )
        )}
      </Card>
    </>
  );
}

export default DCA;
