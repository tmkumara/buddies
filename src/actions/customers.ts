"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import { customerSchema } from "@/lib/validations/customer";
import { OrderStatus } from "@prisma/client";

export async function createCustomer(formData: FormData) {
  await requireAuth();

  const raw = {
    name:        formData.get("name") as string,
    phone:       formData.get("phone") as string,
    phone2:      formData.get("phone2") as string || undefined,
    email:       formData.get("email") as string || undefined,
    addressLine: formData.get("addressLine") as string || undefined,
    notes:       formData.get("notes") as string || undefined,
    active:      true,
  };

  const parsed = customerSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation error" };
  }

  await prisma.customer.create({
    data: {
      name:        parsed.data.name,
      phone:       parsed.data.phone,
      phone2:      parsed.data.phone2 || null,
      email:       parsed.data.email || null,
      addressLine: parsed.data.addressLine || null,
      notes:       parsed.data.notes || null,
      active:      true,
    },
  });

  revalidatePath("/customers");
  return { success: true };
}

export async function updateCustomer(id: number, formData: FormData) {
  await requireAuth();

  const raw = {
    name:        formData.get("name") as string,
    phone:       formData.get("phone") as string,
    phone2:      formData.get("phone2") as string || undefined,
    email:       formData.get("email") as string || undefined,
    addressLine: formData.get("addressLine") as string || undefined,
    notes:       formData.get("notes") as string || undefined,
    active:      formData.get("active") === "true",
  };

  const parsed = customerSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation error" };
  }

  await prisma.customer.update({
    where: { id },
    data: {
      name:        parsed.data.name,
      phone:       parsed.data.phone,
      phone2:      parsed.data.phone2 || null,
      email:       parsed.data.email || null,
      addressLine: parsed.data.addressLine || null,
      notes:       parsed.data.notes || null,
      active:      parsed.data.active,
    },
  });

  revalidatePath("/customers");
  return { success: true };
}

export async function toggleCustomerActive(id: number, active: boolean) {
  await requireAuth();
  await prisma.customer.update({ where: { id }, data: { active } });
  revalidatePath("/customers");
  return { success: true };
}

const ORDER_STATUS_PILL: Record<OrderStatus, string> = {
  DRAFT:         "status-pending",
  CONFIRMED:     "status-fulfilled",
  IN_PRODUCTION: "status-pending",
  READY:         "status-fulfilled",
  DELIVERED:     "status-fulfilled",
  CANCELLED:     "status-cancelled",
};

export async function getCustomerRecentOrders(customerId: number): Promise<{
  id: number;
  orderNo: string;
  orderDate: string;
  status: OrderStatus;
  statusPillClass: string;
}[]> {
  await requireAuth();
  const orders = await prisma.order.findMany({
    where: { customerId },
    select: { id: true, orderNo: true, orderDate: true, status: true },
    orderBy: { orderDate: "desc" },
    take: 5,
  });
  return orders.map((o) => ({
    id:             o.id,
    orderNo:        o.orderNo,
    orderDate:      o.orderDate.toISOString(),
    status:         o.status,
    statusPillClass: ORDER_STATUS_PILL[o.status],
  }));
}
