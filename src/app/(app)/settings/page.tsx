import { requireAdmin } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import TopBar from "@/components/layout/TopBar";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  await requireAdmin();

  const [leadSources, deliveryMethods] = await Promise.all([
    prisma.leadSource.findMany({ orderBy: { id: "asc" }, select: { id: true, name: true, active: true } }),
    prisma.deliveryMethod.findMany({ orderBy: { id: "asc" }, select: { id: true, name: true, active: true } }),
  ]);

  return (
    <>
      <TopBar title="Settings" />
      <div style={{ padding: "1.5rem 1.75rem" }}>
        <div className="content-card">
          <SettingsClient leadSources={leadSources} deliveryMethods={deliveryMethods} />
        </div>
      </div>
    </>
  );
}
