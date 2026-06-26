import prisma from "@/lib/prisma";

export interface InvoiceData {
  orderNo:      string;
  orderDate:    string;
  deliveryDate: string | null;
  customer: {
    name:        string;
    phone:       string;
    phone2:      string | null;
    email:       string | null;
    addressLine: string | null;
  };
  items: {
    designCode: string;
    designName: string;
    quantity:   number;
    unitPrice:  number;
    lineTotal:  number;
  }[];
  totalAmount:     number;
  discountPercent: number;
  discountAmount:  number;
  netAmount:       number;
  payments: {
    paymentDate: string;
    method:      string;
    amount:      number;
    referenceNo: string | null;
  }[];
  totalPaid:   number;
  balance:     number;
  publicToken: string;
  remarks:     string | null;
}

export async function getInvoiceDataByToken(token: string): Promise<InvoiceData | null> {
  const order = await prisma.order.findUnique({
    where: { publicToken: token },
    include: {
      customer: { select: { name: true, phone: true, phone2: true, email: true, addressLine: true } },
      items:    { orderBy: { id: "asc" } },
      payments: { orderBy: { paymentDate: "asc" }, select: { paymentDate: true, method: true, amount: true, referenceNo: true } },
    },
  });
  if (!order) return null;

  const totalPaid = order.payments.reduce((s, p) => s + Number(p.amount), 0);

  return {
    orderNo:      order.orderNo,
    orderDate:    order.orderDate.toISOString().split("T")[0],
    deliveryDate: order.deliveryDate?.toISOString().split("T")[0] ?? null,
    customer:     order.customer,
    items: order.items.map((item) => ({
      designCode: item.designCode,
      designName: item.designName,
      quantity:   item.quantity,
      unitPrice:  Number(item.unitPrice),
      lineTotal:  Number(item.lineTotal),
    })),
    totalAmount:     Number(order.totalAmount),
    discountPercent: Number(order.discountPercent),
    discountAmount:  Number(order.discountAmount),
    netAmount:       Number(order.netAmount),
    payments: order.payments.map((p) => ({
      paymentDate: p.paymentDate.toISOString().split("T")[0],
      method:      p.method as string,
      amount:      Number(p.amount),
      referenceNo: p.referenceNo,
    })),
    totalPaid,
    balance:     Number(order.netAmount) - totalPaid,
    publicToken: order.publicToken || "",
    remarks:     order.remarks,
  };
}

export async function getInvoiceDataById(orderId: number): Promise<InvoiceData | null> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { publicToken: true } });
  if (!order || !order.publicToken) return null;
  return getInvoiceDataByToken(order.publicToken);
}
