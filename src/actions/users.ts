"use server";

import { requireAdmin } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const createSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role:     z.enum(["ADMIN", "STAFF"]),
});

const updateSchema = z.object({
  userId:      z.coerce.number().int().positive(),
  username:    z.string().min(1).max(100),
  role:        z.enum(["ADMIN", "STAFF"]),
  newPassword: z.string().min(8).optional().or(z.literal("")),
});

export async function createUser(formData: FormData) {
  await requireAdmin();

  const parsed = createSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
    role:     formData.get("role"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  const existing = await prisma.user.findUnique({ where: { username: parsed.data.username } });
  if (existing) return { error: "A user with this username already exists." };

  const hashed = await bcrypt.hash(parsed.data.password, 12);

  await prisma.user.create({
    data: {
      username:     parsed.data.username,
      passwordHash: hashed,
      role:         parsed.data.role,
      active:       true,
    },
  });

  revalidatePath("/users");
  return { success: true as const };
}

export async function updateUser(formData: FormData) {
  await requireAdmin();

  const parsed = updateSchema.safeParse({
    userId:      formData.get("userId"),
    username:    formData.get("username"),
    role:        formData.get("role"),
    newPassword: formData.get("newPassword") || "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  const { userId, username, role, newPassword } = parsed.data;

  const updateData: { username: string; role: "ADMIN" | "STAFF"; passwordHash?: string } = { username, role };
  if (newPassword) {
    updateData.passwordHash = await bcrypt.hash(newPassword, 12);
  }

  await prisma.user.update({ where: { id: userId }, data: updateData });
  revalidatePath("/users");
  return { success: true as const };
}

export async function toggleUserActive(userId: number, active: boolean) {
  const session = await requireAdmin();
  if (Number(session.user.id) === userId) return { error: "You cannot deactivate your own account." };

  await prisma.user.update({ where: { id: userId }, data: { active } });
  revalidatePath("/users");
  return { success: true as const };
}
