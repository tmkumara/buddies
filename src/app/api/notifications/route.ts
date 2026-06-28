import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        reads: { where: { userId }, select: { id: true } },
      },
    }),
    prisma.notification.count({
      where: { reads: { none: { userId } } },
    }),
  ]);

  return NextResponse.json({
    unreadCount,
    notifications: notifications.map((n) => ({
      id:        n.id,
      type:      n.type,
      title:     n.title,
      body:      n.body,
      orderId:   n.orderId,
      createdAt: n.createdAt.toISOString(),
      read:      n.reads.length > 0,
    })),
  });
}
