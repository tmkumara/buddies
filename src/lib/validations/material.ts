import { z } from "zod";

export const materialSchema = z.object({
  code:              z.string().min(1, "Code is required").max(50),
  name:              z.string().min(1, "Name is required").max(100),
  gsm:               z.coerce.number().int().min(80, "GSM must be at least 80").max(600, "GSM must be at most 600"),
  sheetLengthCm:     z.coerce.number().positive("Sheet length must be positive").optional().nullable(),
  sheetWidthCm:      z.coerce.number().positive("Sheet width must be positive").optional().nullable(),
  sheetLengthIn:     z.coerce.number().positive("Sheet length must be positive").optional().nullable(),
  sheetWidthIn:      z.coerce.number().positive("Sheet width must be positive").optional().nullable(),
  costPerSheet:      z.coerce.number().nonnegative("Cost must be non-negative"),
  unitPrice:         z.coerce.number().nonnegative("Unit price must be non-negative"),
  minStockLevel:     z.coerce.number().nonnegative("Min stock must be non-negative").default(0),
  currentStockLevel: z.coerce.number().nonnegative("Stock level must be non-negative").default(0),
  status:            z.enum(["ACTIVE", "PENDING", "INACTIVE"]).default("ACTIVE"),
});

export type MaterialInput = z.infer<typeof materialSchema>;
