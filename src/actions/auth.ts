"use server";

import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guards";

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await requireAuth();

  if (newPassword.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }
  if (newPassword === currentPassword) {
    return { error: "New password must differ from current password." };
  }

  const user = await prisma.user.findUnique({
    where: { id: Number(session.user.id) },
  });

  if (!user) return { error: "User not found." };

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return { error: "Current password is incorrect." };

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: false },
  });

  return { success: true };
}
