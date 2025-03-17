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
import { assetsToAllocate } from "@/utils/DCAUtils";
import { FieldProps } from "./DCAForm";

const ForwardedSelect = React.forwardRef<
  never, // Select does not accept ref prop
  React.ComponentPropsWithoutRef<typeof Select>
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
>((props, _ref) => <Select {...props} />);
ForwardedSelect.displayName = "ForwardedSelect";

const ForwardedInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentPropsWithoutRef<typeof Input>
>((props, ref) => <Input {...props} ref={ref} />);
ForwardedInput.displayName = "ForwardedInput";

export default function AssetAllocationField({ control, errors }: FieldProps) {
  return (
    <div className="grid w-full max-w-sm gap-1.5">
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
            render={({ field }) => (
              <ForwardedSelect
                {...field}
                onValueChange={field.onChange}
                value={field.value}
              >
                <SelectTrigger
                  className={`w-[180px] text-lg border-none bg-blue-200 focus:outline-none focus:ring-0 focus:ring-offset-0 ${
                    errors.assetToAllocate ? "border-2 border-red-500" : ""
                  }`}
                >
                  <SelectValue>
                    {assetsToAllocate.find(
                      (option) => option.value === field.value,
                    )?.label || "Select asset"}
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
              </ForwardedSelect>
            )}
          />
          <Controller
            name="allocationAmount"
            control={control}
            render={({ field }) => (
              <ForwardedInput
                {...field}
                type="number"
                placeholder="0.00"
                className={`border-none text-lg no-arrows bg-transparent text-right focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ${
                  errors.allocationAmount ? "border-2 border-red-500" : ""
                }`}
              />
            )}
          />
        </div>
      </div>
      {errors.allocationAmount && (
        <div className="w-full text-left">
          <p className="text-red-500 text-sm">
            {errors.allocationAmount.message}
          </p>
        </div>
      )}
    </div>
  );
}
