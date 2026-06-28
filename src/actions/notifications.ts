"use server";

import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";

export async function markAllNotificationsRead(): Promise<void> {
  const session = await requireAuth();
  const userId  = Number(session.user.id);

  const unread = await prisma.notification.findMany({
    where:  { reads: { none: { userId } } },
    select: { id: true },
  });
  if (unread.length === 0) return;

  await prisma.notificationRead.createMany({
    data: unread.map((n) => ({ notificationId: n.id, userId })),
    skipDuplicates: true,
  });
}

export async function markNotificationRead(notificationId: number): Promise<void> {
  const session = await requireAuth();
  const userId  = Number(session.user.id);

  await prisma.notificationRead.upsert({
    where:  { notificationId_userId: { notificationId, userId } },
    create: { notificationId, userId },
    update: {},
  });
}
