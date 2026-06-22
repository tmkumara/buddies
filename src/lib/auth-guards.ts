import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./auth";

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== "ADMIN") redirect("/dashboard");
  return session;
}
