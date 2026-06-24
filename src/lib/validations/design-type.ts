import { z } from "zod";

export const designTypeSchema = z.object({
  code:        z.string().min(1, "Code is required").max(50).regex(/^[A-Z0-9_-]+$/, "Code must be uppercase alphanumeric"),
  name:        z.string().min(1, "Name is required").max(100),
  description: z.string().max(255).optional().or(z.literal("")),
  imageUrl:    z.string().url("Invalid URL").max(255).optional().or(z.literal("")),
  active:      z.boolean().default(true),
});

export type DesignTypeInput = z.infer<typeof designTypeSchema>;
