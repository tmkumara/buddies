import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";

function csvEscape(val: unknown): string {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function row(cells: unknown[]): string {
  return cells.map(csvEscape).join(",");
}

export async function GET(req: NextRequest) {
  await requireAuth();

  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from");
  const to   = searchParams.get("to");

  const dateFilter =
    from && to
      ? { orderDate: { gte: new Date(from), lte: new Date(to + "T23:59:59Z") } }
      : {};

  const orders = await prisma.order.findMany({
    where:   { ...dateFilter, status: { not: "CANCELLED" } },
    orderBy: { orderDate: "desc" },
    include: {
      customer:   { select: { name: true, phone: true } },
      items:      { select: { designCode: true, designName: true, quantity: true, unitPrice: true, lineTotal: true } },
      payments:   { select: { amount: true, method: true, paymentDate: true } },
    },
  });

  const lines: string[] = [
    row(["Order No", "Order Date", "Customer", "Phone", "Items", "Total Qty", "Subtotal", "Discount %", "Discount Amt", "Net Amount", "Total Paid", "Balance", "Status", "Delivery Date", "Lead Source"]),
  ];

  for (const o of orders) {
    const totalPaid = o.payments.reduce((s, p) => s + Number(p.amount), 0);
    const itemsStr  = o.items.map((i) => `${i.quantity}×${i.designCode}`).join("; ");
    const totalQty  = o.items.reduce((s, i) => s + i.quantity, 0);

    lines.push(row([
      o.orderNo,
      o.orderDate.toISOString().split("T")[0],
      o.customer.name,
      o.customer.phone,
      itemsStr,
      totalQty,
      Number(o.totalAmount).toFixed(2),
      Number(o.discountPercent).toFixed(2),
      Number(o.discountAmount).toFixed(2),
      Number(o.netAmount).toFixed(2),
      totalPaid.toFixed(2),
      Math.max(0, Number(o.netAmount) - totalPaid).toFixed(2),
      o.status,
      o.deliveryDate?.toISOString().split("T")[0] ?? "",
      "",
    ]));
  }

  const csv = lines.join("\r\n");
  const filename = `orders-${from ?? "all"}-${to ?? "all"}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
