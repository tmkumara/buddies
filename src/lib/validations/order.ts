import { z } from "zod";

export const orderItemInputSchema = z.object({
  boxDesignId: z.coerce.number().int().positive("Box design required"),
  quantity:    z.coerce.number().int().positive("Quantity must be at least 1"),
  unitPrice:   z.coerce.number().nonnegative("Unit price must be non-negative"),
});

export const createOrderSchema = z.object({
  customerId:      z.coerce.number().int().positive("Customer is required"),
  orderDate:       z.string().min(1, "Order date is required"),
  deliveryDate:    z.string().optional(),
  discountPercent: z.coerce.number().min(0).max(100).optional(), // optional ADMIN override
  remarks:         z.string().max(255).optional(),
  leadSourceId:    z.coerce.number().int().positive().optional(),
});

export const updateOrderDetailsSchema = z.object({
  deliveryDate:    z.string().optional(),
  remarks:         z.string().max(255).optional(),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  leadSourceId:    z.coerce.number().int().positive().optional(),
});
