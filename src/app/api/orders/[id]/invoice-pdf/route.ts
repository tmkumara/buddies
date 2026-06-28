import { NextRequest, NextResponse } from "next/server";
import * as ReactPDF from "@react-pdf/renderer";
import React from "react";
import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import { OrderInvoicePDF, type OrderPDFData } from "@/lib/invoice-order-pdf";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAuth();
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id: Number(id) },
    include: {
      customer: true,
      items: {
        orderBy: { id: "asc" },
        include: {
          boxDesign: {
            select: {
              lengthCm: true, widthCm: true, heightCm: true,
              lengthIn: true, widthIn: true, heightIn: true,
              designType: { select: { name: true } },
            },
          },
        },
      },
      payments: { orderBy: { paymentDate: "asc" }, select: { amount: true, paymentDate: true, method: true, referenceNo: true } },
    },
  });

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const totalAmount    = Number(order.totalAmount);
  const discountAmount = Number(order.discountAmount);
  const netAmount      = Number(order.netAmount);
  const totalPaid      = order.payments.reduce((s, p) => s + Number(p.amount), 0);

  const data: OrderPDFData = {
    orderNo:        order.orderNo,
    orderDate:      order.orderDate.toISOString().split("T")[0],
    deliveryDate:   order.deliveryDate?.toISOString().split("T")[0] ?? null,
    status:         order.status,
    remarks:        order.remarks,
    customer: {
      name:        order.customer.name,
      phone:       order.customer.phone,
      phone2:      order.customer.phone2,
      email:       order.customer.email,
      addressLine: order.customer.addressLine,
    },
    items: order.items.map((i) => {
      const bd = i.boxDesign;
      const inDims = ([bd?.lengthIn, bd?.widthIn, bd?.heightIn] as (object | null | undefined)[])
        .filter((v): v is object => v != null)
        .map((v) => Number(v).toFixed(1));
      const cmDims = ([bd?.lengthCm, bd?.widthCm, bd?.heightCm] as (object | null | undefined)[])
        .filter((v): v is object => v != null)
        .map((v) => Number(v).toFixed(0));
      const sizeStr = inDims.length > 0
        ? inDims.join("×") + " in"
        : cmDims.length > 0 ? cmDims.join("×") + " cm" : undefined;
      return {
        designCode:  i.designCode,
        designName:  i.designName,
        boxTypeName: bd?.designType?.name,
        sizeCm:      sizeStr,
        quantity:    i.quantity,
        unitPrice:   Number(i.unitPrice),
        lineTotal:   Number(i.lineTotal),
      };
    }),
    totalAmount,
    discountAmount,
    discountPct:  totalAmount > 0 ? Math.round((discountAmount / totalAmount) * 1000) / 10 : 0,
    netAmount,
    totalPaid,
    balance:      netAmount - totalPaid,
    payments: order.payments.map((p) => ({
      paymentDate: p.paymentDate.toISOString().split("T")[0],
      method:      p.method,
      referenceNo: p.referenceNo,
      amount:      Number(p.amount),
    })),
  };

  const element = React.createElement(OrderInvoicePDF, { data }) as React.ReactElement<ReactPDF.DocumentProps>;
  const buffer  = await ReactPDF.renderToBuffer(element);

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="Invoice-${order.orderNo}.pdf"`,
    },
  });
}
