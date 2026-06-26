import { requireAdmin } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import TopBar from "@/components/layout/TopBar";
import UsersClient from "./UsersClient";

export default async function UsersPage() {
  const session = await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, username: true, role: true, active: true, createdAt: true },
  });

  const serialized = users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString().split("T")[0],
  }));

  return (
    <>
      <TopBar title="Users" />
      <div style={{ padding: "1.5rem 1.75rem" }}>
        <UsersClient users={serialized} currentUserId={Number(session.user.id)} />
      </div>
    </>
  );
}
