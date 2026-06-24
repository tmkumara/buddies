import { z } from "zod";

export const customerSchema = z.object({
  name:        z.string().min(1, "Name is required").max(150),
  phone:       z.string().min(1, "Phone is required").max(30),
  email:       z.string().email("Invalid email").max(150).optional().or(z.literal("")),
  addressLine: z.string().max(255).optional().or(z.literal("")),
  notes:       z.string().max(255).optional().or(z.literal("")),
  active:      z.boolean().default(true),
});

export type CustomerInput = z.infer<typeof customerSchema>;
