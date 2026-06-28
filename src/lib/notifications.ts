import { Resend } from "resend";
import prisma from "@/lib/prisma";
import { getInvoiceDataById } from "@/lib/invoice-data";
import { buildStatusEmail } from "@/lib/email-templates";

const EMAIL_STATUSES = new Set(["CONFIRMED", "READY", "DELIVERED", "CANCELLED"]);

export type NotificationType =
  | "ORDER_CREATED"
  | "ORDER_STATUS_CHANGED"
  | "PAYMENT_RECEIVED"
  | "LOW_STOCK";

export interface NotificationPayload {
  type:          NotificationType;
  title:         string;
  body:          string;
  orderId?:      number;
  orderStatus?:  string;      // new status; used to decide email template + whether to send
  customerEmail?: string;     // customer's email address; send email if set + orderStatus warrants it
}

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

export async function notificationService(payload: NotificationPayload): Promise<void> {
  // 1. Write in-app notification to DB
  try {
    await prisma.notification.create({
      data: {
        type:    payload.type,
        title:   payload.title,
        body:    payload.body,
        orderId: payload.orderId ?? null,
      },
    });
  } catch (err) {
    console.error("[notificationService] DB write failed:", err);
  }

  // 2. Send customer email (fire-and-forget)
  if (
    payload.type === "ORDER_STATUS_CHANGED" &&
    payload.orderStatus &&
    EMAIL_STATUSES.has(payload.orderStatus) &&
    payload.customerEmail &&
    payload.orderId
  ) {
    const resend = getResend();
    if (resend) {
      (async () => {
        try {
          const invoiceData = await getInvoiceDataById(payload.orderId!);
          if (!invoiceData) return;
          const result = buildStatusEmail(payload.orderStatus!, invoiceData);
          if (!result) return;
          const from = process.env.RESEND_FROM_EMAIL ?? "Buddies <onboarding@resend.dev>";
          await resend.emails.send({
            from,
            to:      [payload.customerEmail!],
            subject: result.subject,
            html:    result.html,
          });
        } catch (err) {
          console.error("[notificationService] Email send failed:", err);
        }
      })();
    }
  }
}
