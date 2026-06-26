import { z } from "zod";

export const designTypeSchema = z.object({
  code:        z.string().min(1, "Code is required").max(50).regex(/^[A-Z0-9_-]+$/, "Code must be uppercase alphanumeric"),
  name:        z.string().min(1, "Name is required").max(100),
  description: z.string().max(255).optional().or(z.literal("")),
  imageUrl:    z.string().max(500).refine(
    (val) => !val || val.startsWith("/uploads/") || /^https?:\/\//.test(val),
    "Must be an uploaded file or a valid URL"
  ).optional().or(z.literal("")),
  active:      z.boolean().default(true),
});

export type DesignTypeInput = z.infer<typeof designTypeSchema>;
