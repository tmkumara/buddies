import { z } from "zod";

const optDim = z.coerce.number().positive().optional().nullable();

export const boxDesignSchema = z.object({
  code:         z.string().min(1, "Code is required").max(50),
  name:         z.string().min(1, "Name is required").max(150),
  designTypeId: z.coerce.number().int().positive("Design type is required"),
  materialId:   z.coerce.number().int().positive("Material is required"),
  lengthCm:     optDim,
  widthCm:      optDim,
  heightCm:     optDim,
  lengthIn:     optDim,
  widthIn:      optDim,
  heightIn:     optDim,
  cutLengthCm:  optDim,
  cutWidthCm:   optDim,
  cutLengthIn:  optDim,
  cutWidthIn:   optDim,
  unitPrice:    z.coerce.number().nonnegative("Unit price must be non-negative"),
  custom:       z.boolean().default(false),
  active:       z.boolean().default(true),
});

export type BoxDesignInput = z.infer<typeof boxDesignSchema>;
