import { z } from "zod";

export const orderItemInputSchema = z.object({
  boxDesignId: z.number().int().positive().optional(),
  stockItemId: z.number().int().positive().optional(),
  quantity:    z.number().int().min(1),
  unitPrice:   z.number().min(0),
}).refine(
  (d) => (d.boxDesignId !== undefined) !== (d.stockItemId !== undefined),
  { message: "Exactly one of boxDesignId or stockItemId must be provided" }
);

export const createOrderSchema = z.object({
  customerId:      z.coerce.number().int().positive("Customer is required"),
  orderDate:       z.string().min(1, "Order date is required"),
  deliveryDate:    z.string().optional(),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  deliveryCharge:  z.coerce.number().min(0).optional(),
  deliveryMethodId: z.coerce.number().int().positive().optional(),
  remarks:         z.string().max(255).optional(),
  leadSourceId:    z.coerce.number().int().positive().optional(),
});

export const updateOrderDetailsSchema = z.object({
  deliveryDate:    z.string().optional(),
  remarks:         z.string().max(255).optional(),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  leadSourceId:    z.coerce.number().int().positive().optional(),
});
