"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";

export async function getLeadSources() {
  return prisma.leadSource.findMany({
    where:   { active: true },
    orderBy: { id: "asc" },
    select:  { id: true, name: true },
  });
}

export async function createLeadSource(formData: FormData) {
  const session = await requireAuth();
  if (session.user.role !== "ADMIN") return { error: "Admin only" };

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Name is required" };
  if (name.length > 100) return { error: "Name must be 100 characters or less" };

  await prisma.leadSource.create({ data: { name } });
  revalidatePath("/settings/lead-sources");
  return { success: true as const };
}

export async function updateLeadSource(formData: FormData) {
  const session = await requireAuth();
  if (session.user.role !== "ADMIN") return { error: "Admin only" };

  const id     = parseInt(formData.get("id") as string);
  const name   = (formData.get("name") as string)?.trim();
  const active = formData.get("active") !== "false";

  if (!id || isNaN(id)) return { error: "Invalid lead source ID" };
  if (!name) return { error: "Name is required" };

  await prisma.leadSource.update({ where: { id }, data: { name, active } });
  revalidatePath("/settings/lead-sources");
  return { success: true as const };
}
