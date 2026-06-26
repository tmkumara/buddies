import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import TopBar from "@/components/layout/TopBar";
import CustomersClient from "@/components/customers/CustomersClient";

export default async function CustomersPage({
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

  const activeFilter =
    status === "ACTIVE"   ? true  :
    status === "INACTIVE" ? false :
    undefined;

  const where = {
    active: activeFilter,
    OR: q
      ? [
          { name:   { contains: q } },
          { phone:  { contains: q } },
          { phone2: { contains: q } },
          { email:  { contains: q } },
        ]
      : undefined,
  };

  const [raw, filteredTotal, totalAll, totalActive, totalInactive] = await Promise.all([
    prisma.customer.findMany({ where, skip, take: size, orderBy: { name: "asc" } }),
    prisma.customer.count({ where }),
    prisma.customer.count(),
    prisma.customer.count({ where: { active: true } }),
    prisma.customer.count({ where: { active: false } }),
  ]);

  const customers = raw.map((c) => ({
    id:          c.id,
    name:        c.name,
    phone:       c.phone,
    phone2:      c.phone2,
    email:       c.email,
    addressLine: c.addressLine,
    notes:       c.notes,
    active:      c.active,
  }));

  return (
    <>
      <TopBar title="Customers" />
      <CustomersClient
        customers={customers}
        filteredTotal={filteredTotal}
        page={page}
        size={size}
        currentQ={q ?? ""}
        currentStatus={status && ["ACTIVE", "INACTIVE"].includes(status) ? status : "ALL"}
        statTotals={{ total: totalAll, active: totalActive, inactive: totalInactive }}
      />
    </>
  );
}
