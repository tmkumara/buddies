import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import EditCustomerForm from "./EditCustomerForm";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  const customer = await prisma.customer.findUnique({ where: { id: Number(id) } });
  if (!customer) notFound();

  return (
    <>
      <TopBar title="Edit Customer" />
      <div style={{ padding: "1.5rem 1.75rem", maxWidth: "560px" }}>
        <EditCustomerForm customer={customer} />
      </div>
    </>
  );
}
