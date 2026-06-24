"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createCustomer } from "@/actions/customers";
import TopBar from "@/components/layout/TopBar";

export default function NewCustomerPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await createCustomer(new FormData(e.currentTarget));
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/customers");
    }
  }

  return (
    <>
      <TopBar title="New Customer" />

      <div style={{ padding: "1.5rem 1.75rem", maxWidth: "560px" }}>
        <Link href="/customers" className="nav-link" style={{ fontSize: "0.68rem", display: "inline-block", marginBottom: "1.25rem" }}>
          ← Back to Customers
        </Link>

        <div className="content-card">
          <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#F5B61E", letterSpacing: "0.04em", marginBottom: "1.5rem" }}>
            Customer Details
          </h2>

          {error && <div className="form-error mb-5">{error}</div>}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div className="form-field">
              <label htmlFor="name" className="form-label">NAME *</label>
              <input id="name" name="name" type="text" className="form-input" placeholder="Customer name" required />
            </div>

            <div className="form-field">
              <label htmlFor="phone" className="form-label">PHONE *</label>
              <input id="phone" name="phone" type="text" className="form-input" placeholder="+94 77 123 4567" required />
            </div>

            <div className="form-field">
              <label htmlFor="email" className="form-label">EMAIL</label>
              <input id="email" name="email" type="email" className="form-input" placeholder="customer@example.com" />
            </div>

            <div className="form-field">
              <label htmlFor="addressLine" className="form-label">ADDRESS</label>
              <input id="addressLine" name="addressLine" type="text" className="form-input" placeholder="Street, City" />
            </div>

            <div className="form-field">
              <label htmlFor="notes" className="form-label">NOTES</label>
              <textarea
                id="notes"
                name="notes"
                className="form-input"
                placeholder="Any notes about this customer…"
                rows={3}
                style={{ resize: "vertical" }}
              />
            </div>

            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
              <button type="submit" className="submit-btn" disabled={loading} style={{ flex: 1 }}>
                {loading ? "SAVING…" : "SAVE CUSTOMER"}
              </button>
              <Link href="/customers">
                <button type="button" style={{
                  padding: "0.7rem 1.25rem", background: "none",
                  border: "1px solid rgba(245,182,30,0.18)", borderRadius: "0.5rem",
                  color: "rgba(240,237,230,0.45)", fontSize: "0.72rem",
                  letterSpacing: "0.08em", cursor: "pointer",
                }}>
                  CANCEL
                </button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
