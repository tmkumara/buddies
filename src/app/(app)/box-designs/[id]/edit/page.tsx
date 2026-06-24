import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import BoxDesignForm from "../../BoxDesignForm";

export default async function EditBoxDesignPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;

  const [boxDesign, designTypes, materials] = await Promise.all([
    prisma.boxDesign.findUnique({ where: { id: Number(id) } }),
    prisma.designType.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, code: true, name: true } }),
    prisma.material.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, code: true, name: true } }),
  ]);

  if (!boxDesign) notFound();

  return (
    <>
      <TopBar title="Edit Box Design" />
      <div style={{ padding: "1.5rem 1.75rem", maxWidth: "680px" }}>
        <BoxDesignForm designTypes={designTypes} materials={materials} existing={boxDesign} />
      </div>
    </>
  );
}
