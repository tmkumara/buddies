import { z } from "zod";

export const createPaymentSchema = z.object({
  amount:      z.coerce.number().positive("Amount must be greater than 0"),
  paymentDate: z.string().min(1, "Payment date is required"),
  method:      z.enum(["CASH", "BANK_TRANSFER", "CHEQUE"], { message: "Invalid payment method" }),
  referenceNo: z.string().max(100).optional(),
  note:        z.string().max(255).optional(),
});
