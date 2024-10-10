import React from "react";
import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldProps } from "./DCAForm";

// Forward ref correctly for Input, since it accepts ref prop
const ForwardedInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentPropsWithoutRef<typeof Input>
>((props, ref) => <Input {...props} ref={ref} />);
ForwardedInput.displayName = "ForwardedInput";

export default function NumberOfOrdersField({ control, errors }: FieldProps) {
  return (
    <div className="grid w-full max-w-sm items-center gap-1.5">
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
            <ForwardedInput
              {...field}
              type="number"
              placeholder="0"
              className={`border-none bg-transparent text-lg no-arrows text-left focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ${
                errors.numberOfOrders ? "border-2 border-red-500" : ""
              }`}
            />
          )}
        />
        <Label className="flex pr-2" htmlFor="orders">
          orders
        </Label>
      </div>
      {errors.numberOfOrders && (
        <p className="text-red-500 text-sm">{errors.numberOfOrders.message}</p>
      )}
    </div>
  );
}
