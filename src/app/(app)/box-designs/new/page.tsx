import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import TopBar from "@/components/layout/TopBar";
import BoxDesignForm from "../BoxDesignForm";

export default async function NewBoxDesignPage() {
  await requireAuth();

  const [designTypes, materials] = await Promise.all([
    prisma.designType.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, code: true, name: true } }),
    prisma.material.findMany({ where: { status: { not: "INACTIVE" } }, orderBy: { name: "asc" }, select: { id: true, code: true, name: true } }),
  ]);

  return (
    <>
      <TopBar title="New Box Design" />
      <div style={{ padding: "1.5rem 1.75rem", maxWidth: "680px" }}>
        <BoxDesignForm designTypes={designTypes} materials={materials} />
      </div>
    </>
  );
}
