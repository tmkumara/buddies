import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import TopBar from "@/components/layout/TopBar";
import DesignTypesClient from "@/components/design-types/DesignTypesClient";

const VALID_SIZES = [20, 50, 100];

export default async function DesignTypesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; size?: string }>;
}) {
  await requireAuth();

  const { q, status, page: pageParam, size: sizeParam } = await searchParams;

  // Validate size — default 20
  const size = VALID_SIZES.includes(parseInt(sizeParam ?? ""))
    ? parseInt(sizeParam!)
    : 20;

  // Validate page — default 1
  const page = Math.max(1, parseInt(pageParam ?? "1") || 1);
  const skip = (page - 1) * size;

  // Map status filter: "" or undefined → undefined (show ALL), "ACTIVE" → true, "INACTIVE" → false
  const activeFilter =
    status === "ACTIVE" ? true : status === "INACTIVE" ? false : undefined;

  const where = {
    active: activeFilter,
    OR: q
      ? [{ code: { contains: q } }, { name: { contains: q } }]
      : undefined,
  };

  const [designTypes, filteredTotal, totalCount, activeCount, inactiveCount] =
    await Promise.all([
      prisma.designType.findMany({
        where,
        skip,
        take: size,
        orderBy: { code: "asc" },
        select: { id: true, code: true, name: true, description: true, imageUrl: true, active: true },
      }),
      prisma.designType.count({ where }),
      prisma.designType.count(),
      prisma.designType.count({ where: { active: true } }),
      prisma.designType.count({ where: { active: false } }),
    ]);

  // Build currentParams — only include non-default params
  const currentParams: Record<string, string> = {};
  if (q) currentParams.q = q;
  if (status === "ACTIVE" || status === "INACTIVE") currentParams.status = status;
  if (size !== 20) currentParams.size = String(size);

  return (
    <>
      <TopBar title="Design Types" />
      <DesignTypesClient
        designTypes={designTypes}
        filteredTotal={filteredTotal}
        page={page}
        size={size}
        currentQ={q ?? ""}
        currentStatus={status === "ACTIVE" || status === "INACTIVE" ? status : "ALL"}
        statTotals={{ total: totalCount, active: activeCount, inactive: inactiveCount }}
        currentParams={currentParams}
      />
    </>
  );
}
