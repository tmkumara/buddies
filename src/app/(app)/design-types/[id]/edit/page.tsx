import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import EditDesignTypeForm from "./EditDesignTypeForm";

export default async function EditDesignTypePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  const dt = await prisma.designType.findUnique({ where: { id: Number(id) } });
  if (!dt) notFound();

  return (
    <>
      <TopBar title="Edit Design Type" />
      <div style={{ padding: "1.5rem 1.75rem", maxWidth: "520px" }}>
        <EditDesignTypeForm designType={dt} />
      </div>
    </>
  );
}
