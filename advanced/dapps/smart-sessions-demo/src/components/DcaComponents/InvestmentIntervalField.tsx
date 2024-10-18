import React from "react";
import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { intervalOptions } from "@/utils/DCAUtils";
import { FieldProps } from "./DCAForm";

const ForwardedSelect = React.forwardRef<
  never, // Select does not accept ref prop
  React.ComponentPropsWithoutRef<typeof Select>
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
>((props, _ref) => <Select {...props} />);
ForwardedSelect.displayName = "ForwardedSelect";

// Forward ref correctly for Input, since it accepts ref prop
const ForwardedInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentPropsWithoutRef<typeof Input>
>((props, ref) => <Input {...props} ref={ref} />);
ForwardedInput.displayName = "ForwardedInput";

export default function InvestmentIntervalField({
  control,
  errors,
}: FieldProps) {
  return (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label className="flex" htmlFor="investmentInterval">
        Every
      </Label>
      <div className="flex w-full max-w-sm items-center align-center space-x-2">
        <div className="flex flex-col w-full">
          <div className="flex w-full items-center align-center space-x-2">
            <Controller
              name="investmentInterval"
              control={control}
              render={({ field }) => (
                <ForwardedInput
                  {...field}
                  type="number"
                  placeholder="0"
                  className={`border-none bg-blue-200 text-lg no-arrows text-left focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ${
                    errors.investmentInterval ? "border-2 border-red-500" : ""
                  }`}
                />
              )}
            />
            <Controller
              name="intervalUnit"
              control={control}
              render={({ field }) => (
                <ForwardedSelect
                  {...field}
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <SelectTrigger
                    className={`w-[180px] text-lg border-none bg-blue-200 focus:outline-none focus:ring-0 focus:ring-offset-0 ${
                      errors.intervalUnit ? "border-2 border-red-500" : ""
                    }`}
                  >
                    <SelectValue>
                      {intervalOptions.find(
                        (option) => option.value === field.value,
                      )?.label || "Select interval"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {intervalOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </ForwardedSelect>
              )}
            />
          </div>
          {errors.investmentInterval && (
            <p className="text-red-500 text-sm">
              {errors.investmentInterval.message}
            </p>
          )}
          {errors.intervalUnit && (
            <p className="text-red-500 text-sm">
              {errors.intervalUnit.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
