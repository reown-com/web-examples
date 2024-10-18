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
import { assetsToBuy } from "@/utils/DCAUtils";
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

export default function AssetToBuyField({ control, errors }: FieldProps) {
  return (
    <div className="grid w-full max-w-sm gap-1.5">
      <div
        className={`grid max-w-sm items-center gap-1.5 rounded-lg p-4 bg-blue-200 focus-within:ring-2 focus-within:border-blue-500 ${
          errors.assetToBuy ? "border-2 border-red-500" : ""
        }`}
      >
        <Label className="flex" htmlFor="assetToBuy">
          To Buy
        </Label>
        <Controller
          name="assetToBuy"
          control={control}
          render={({ field }) => (
            <ForwardedSelect
              {...field}
              onValueChange={field.onChange}
              value={field.value}
            >
              <SelectTrigger
                className={`w-full text-lg border-none bg-transparent focus:outline-none focus:ring-0 focus:ring-offset-0 ${
                  errors.assetToBuy ? "border-2 border-red-500" : ""
                }`}
              >
                <SelectValue>
                  {assetsToBuy.find((option) => option.value === field.value)
                    ?.label || "Select asset"}
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
            </ForwardedSelect>
          )}
        />
      </div>
      {errors.assetToBuy && (
        <div className="w-full text-left">
          <p className="text-red-500 text-sm">{errors.assetToBuy.message}</p>
        </div>
      )}
    </div>
  );
}
