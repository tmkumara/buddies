import { NextRequest, NextResponse } from "next/server";
import * as ReactPDF from "@react-pdf/renderer";
import { getInvoiceDataByToken } from "@/lib/invoice-data";
import { InvoicePDFDocument } from "@/lib/invoice-pdf";
import React from "react";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const data = await getInvoiceDataByToken(token);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const element = React.createElement(
    InvoicePDFDocument,
    { data },
  ) as React.ReactElement<ReactPDF.DocumentProps>;

  const buffer = await ReactPDF.renderToBuffer(element);

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${data.orderNo}.pdf"`,
    },
  });
}
