"use client";

import Link from "next/link";
import { toggleCustomerActive } from "@/actions/customers";

interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  active: boolean;
}

export default function CustomerRow({ customer }: { customer: Customer }) {
  async function handleToggle() {
    await toggleCustomerActive(customer.id, !customer.active);
  }

  return (
    <tr>
      <td style={{ fontWeight: 600, color: "#F0EDE6" }}>{customer.name}</td>
      <td style={{ color: "rgba(240,237,230,0.6)" }}>{customer.phone}</td>
      <td style={{ color: "rgba(240,237,230,0.4)", fontSize: "0.72rem" }}>{customer.email ?? "—"}</td>
      <td>
        <span className={`status-pill ${customer.active ? "status-fulfilled" : "status-cancelled"}`}>
          {customer.active ? "ACTIVE" : "INACTIVE"}
        </span>
      </td>
      <td style={{ textAlign: "right" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.75rem" }}>
          <Link href={`/customers/${customer.id}/edit`} className="nav-link" style={{ fontSize: "0.68rem" }}>
            Edit
          </Link>
          <form action={handleToggle}>
            <button
              type="submit"
              className="nav-link"
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: "0.68rem", color: customer.active ? "#F87171" : "#4ADE80",
              }}
            >
              {customer.active ? "Deactivate" : "Activate"}
            </button>
          </form>
        </div>
      </td>
    </tr>
  );
}
