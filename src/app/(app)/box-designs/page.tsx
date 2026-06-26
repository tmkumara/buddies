import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import TopBar from "@/components/layout/TopBar";
import BoxDesignsClient from "@/components/box-designs/BoxDesignsClient";

export default async function BoxDesignsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; size?: string }>;
}) {
  await requireAuth();
  const { q, status, page: pageParam, size: sizeParam } = await searchParams;

  const VALID_SIZES = [20, 50, 100];
  const size = VALID_SIZES.includes(parseInt(sizeParam ?? "")) ? parseInt(sizeParam!) : 20;
  const page = Math.max(1, parseInt(pageParam ?? "1") || 1);
  const skip = (page - 1) * size;

  const where =
    status === "ACTIVE"   ? { active: true,  ...(q ? { OR: [{ code: { contains: q } }, { name: { contains: q } }] } : {}) } :
    status === "INACTIVE" ? { active: false, ...(q ? { OR: [{ code: { contains: q } }, { name: { contains: q } }] } : {}) } :
    status === "CUSTOM"   ? { custom: true,  ...(q ? { OR: [{ code: { contains: q } }, { name: { contains: q } }] } : {}) } :
    q ? { OR: [{ code: { contains: q } }, { name: { contains: q } }] } : {};

  const [raw, filteredTotal, totalAll, totalActive, totalInactive, totalCustom, designTypes, materials] =
    await Promise.all([
      prisma.boxDesign.findMany({
        where,
        skip,
        take: size,
        include: { designType: { select: { name: true } }, material: { select: { code: true } } },
        orderBy: { code: "asc" },
      }),
      prisma.boxDesign.count({ where }),
      prisma.boxDesign.count(),
      prisma.boxDesign.count({ where: { active: true } }),
      prisma.boxDesign.count({ where: { active: false } }),
      prisma.boxDesign.count({ where: { custom: true } }),
      prisma.designType.findMany({ where: { active: true }, select: { id: true, code: true, name: true }, orderBy: { code: "asc" } }),
      prisma.material.findMany({ where: { status: "ACTIVE" }, select: { id: true, code: true, name: true }, orderBy: { code: "asc" } }),
    ]);

  const designs = raw.map((d) => ({
    id:             d.id,
    code:           d.code,
    name:           d.name,
    designTypeId:   d.designTypeId,
    designTypeName: d.designType.name,
    materialId:     d.materialId,
    materialCode:   d.material.code,
    lengthCm:    d.lengthCm    != null ? Number(d.lengthCm)    : null,
    widthCm:     d.widthCm     != null ? Number(d.widthCm)     : null,
    heightCm:    d.heightCm    != null ? Number(d.heightCm)    : null,
    lengthIn:    d.lengthIn    != null ? Number(d.lengthIn)    : null,
    widthIn:     d.widthIn     != null ? Number(d.widthIn)     : null,
    heightIn:    d.heightIn    != null ? Number(d.heightIn)    : null,
    cutLengthCm: d.cutLengthCm != null ? Number(d.cutLengthCm) : null,
    cutWidthCm:  d.cutWidthCm  != null ? Number(d.cutWidthCm)  : null,
    cutLengthIn: d.cutLengthIn != null ? Number(d.cutLengthIn) : null,
    cutWidthIn:  d.cutWidthIn  != null ? Number(d.cutWidthIn)  : null,
    unitPrice:   Number(d.unitPrice),
    custom:      d.custom,
    active:      d.active,
  }));

  return (
    <>
      <TopBar title="Box Designs" />
      <BoxDesignsClient
        designs={designs}
        filteredTotal={filteredTotal}
        page={page}
        size={size}
        currentQ={q ?? ""}
        currentStatus={status && ["ACTIVE", "INACTIVE", "CUSTOM"].includes(status) ? status : "ALL"}
        statTotals={{ total: totalAll, active: totalActive, inactive: totalInactive, custom: totalCustom }}
        designTypes={designTypes}
        materials={materials}
      />
    </>
  );
}
