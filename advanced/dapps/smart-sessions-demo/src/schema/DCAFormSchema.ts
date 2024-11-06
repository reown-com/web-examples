import { z } from "zod";

export const dcaFormSchema = z.object({
  assetToAllocate: z
    .string({
      required_error: "Asset required",
    })
    .min(1, { message: "Select an asset." }),

  allocationAmount: z
    .string({
      required_error: "Amount required",
      invalid_type_error: "Must be a number",
    })
    .transform((val) => parseFloat(val))
    .refine((val) => !isNaN(val) && val > 0, {
      message: "Must be greater than 0.",
    }),

  assetToBuy: z
    .string({
      required_error: "Asset required",
    })
    .min(1, { message: "Select an asset." }),

  investmentInterval: z
    .string({
      required_error: "Interval required",
      invalid_type_error: "Must be a number",
    })
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val >= 1, {
      message: "Must be at least 1.",
    }),

  intervalUnit: z.enum(["second","minute", "hour", "day", "week"], {
    required_error: "Unit required",
  }),

  numberOfOrders: z
    .string({
      required_error: "Orders required",
      invalid_type_error: "Must be a number",
    })
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val >= 1, {
      message: "Must be at least 1.",
    }),

  createdTimestamp: z.number().optional(),
});

// Export the inferred type based on the schema
export type DCAFormSchemaType = z.infer<typeof dcaFormSchema>;
