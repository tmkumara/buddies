import { requireAdmin } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import TopBar from "@/components/layout/TopBar";
import LeadSourcesClient from "./LeadSourcesClient";

export default async function LeadSourcesPage() {
  await requireAdmin();

  const sources = await prisma.leadSource.findMany({
    orderBy: { id: "asc" },
    select: { id: true, name: true, active: true },
  });

  return (
    <>
      <TopBar title="Lead Sources" />
      <div style={{ padding: "1.5rem 1.75rem" }}>
        <LeadSourcesClient sources={sources} />
      </div>
    </>
  );
}
