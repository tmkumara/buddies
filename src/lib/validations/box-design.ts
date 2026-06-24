import { z } from "zod";

export const boxDesignSchema = z.object({
  code:          z.string().min(1, "Code is required").max(50),
  name:          z.string().min(1, "Name is required").max(150),
  designTypeId:  z.coerce.number().int().positive("Design type is required"),
  materialId:    z.coerce.number().int().positive("Material is required"),
  lengthCm:      z.coerce.number().positive("Length must be positive"),
  widthCm:       z.coerce.number().positive("Width must be positive"),
  heightCm:      z.coerce.number().positive("Height must be positive"),
  cutLengthCm:   z.coerce.number().positive("Cut length must be positive"),
  cutWidthCm:    z.coerce.number().positive("Cut width must be positive"),
  unitPrice:     z.coerce.number().nonnegative("Unit price must be non-negative"),
  custom:        z.boolean().default(false),
  active:        z.boolean().default(true),
});

export type BoxDesignInput = z.infer<typeof boxDesignSchema>;
