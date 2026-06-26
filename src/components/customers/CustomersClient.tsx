"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { ChevronRight } from "lucide-react";
import StatChip from "@/components/ui/StatChip";
import FilterTabBar from "@/components/ui/FilterTabBar";
import PaginationBar from "@/components/ui/PaginationBar";
import CustomerSlideOver, { CustomerData } from "./CustomerSlideOver";
import CustomerExpandRow from "./CustomerExpandRow";

export interface CustomerRow {
  id: number;
  name: string;
  phone: string;
  phone2: string | null;
  email: string | null;
  addressLine: string | null;
  notes: string | null;
  active: boolean;
}

interface StatTotals {
  total: number;
  active: number;
  inactive: number;
}

interface Props {
  customers: CustomerRow[];
  filteredTotal: number;
  page: number;
  size: number;
  currentQ: string;
  currentStatus: string;
  statTotals: StatTotals;
}

const TABS = ["ALL", "ACTIVE", "INACTIVE"];

export default function CustomersClient({
  customers,
  filteredTotal,
  page,
  size,
  currentQ,
  currentStatus,
  statTotals,
}: Props) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(currentQ);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [slideOpen, setSlideOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState<CustomerData | undefined>(undefined);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (searchValue) params.set("q", searchValue);
      if (currentStatus && currentStatus !== "ALL") params.set("status", currentStatus);
      params.set("size", String(size));
      router.replace(`?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue]);

  const currentParams: Record<string, string> = {};
  if (searchValue) currentParams.q = searchValue;
  if (currentStatus && currentStatus !== "ALL") currentParams.status = currentStatus;
  currentParams.size = String(size);

  function openNew() { setEditTarget(undefined); setSlideOpen(true); }
  function openEdit(id: number) {
    const c = customers.find((x) => x.id === id);
    if (c) { setEditTarget(c as CustomerData); setSlideOpen(true); }
  }
  function closeSlide() { setSlideOpen(false); setEditTarget(undefined); }

  return (
    <div style={{ padding: "1.25rem 1.75rem" }}>
      {/* Stat strip */}
      <div className="stat-strip" style={{ marginBottom: "1rem" }}>
        <StatChip label="TOTAL"    value={statTotals.total} />
        <StatChip label="ACTIVE"   value={statTotals.active}   color="#4ADE80" />
        <StatChip label="INACTIVE" value={statTotals.inactive} color="#F87171" />
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <div style={{ position: "relative", flex: "1 1 180px", maxWidth: "280px" }}>
          <Search size={12} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "rgba(240,237,230,0.22)", pointerEvents: "none" }} />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search name, phone, email…"
            className="form-input"
            style={{ paddingLeft: "2.1rem", fontSize: "0.76rem" }}
          />
        </div>
        <FilterTabBar tabs={TABS} activeTab={currentStatus || "ALL"} currentParams={currentParams} />
        <button
          type="button"
          className="cta-btn"
          onClick={openNew}
          style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.68rem", padding: "0.48rem 1rem", marginLeft: "auto" }}
        >
          <Plus size={12} /> New Customer
        </button>
      </div>

      {customers.length === 0 && (
        <div className="content-card" style={{ padding: "3rem 0", textAlign: "center", fontSize: "0.8rem", color: "rgba(240,237,230,0.22)" }}>
          {searchValue || currentStatus !== "ALL" ? "No customers match your filter." : "No customers yet."}
        </div>
      )}

      {/* Desktop/tablet table */}
      {customers.length > 0 && (
        <div id="customers-table-view">
          <div className="content-card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="orders-table">
              <thead>
                <tr>
                  <th style={{ width: "2rem" }} />
                  <th>NAME</th>
                  <th>PHONE</th>
                  <th className="hide-tablet">EMAIL</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => {
                  const isExpanded = expandedId === c.id;
                  return (
                    <React.Fragment key={c.id}>
                      <tr
                        style={{
                          opacity: c.active ? 1 : 0.55,
                          cursor: "pointer",
                        }}
                        onClick={() => setExpandedId(isExpanded ? null : c.id)}
                      >
                        <td style={{ paddingRight: 0 }}>
                          <ChevronRight size={14} className={`row-chevron${isExpanded ? " expanded" : ""}`} />
                        </td>
                        <td style={{ fontWeight: 600, color: "#F0EDE6" }}>{c.name}</td>
                        <td style={{ color: "rgba(240,237,230,0.65)" }}>{c.phone}</td>
                        <td className="hide-tablet" style={{ color: "rgba(240,237,230,0.42)", fontSize: "0.76rem" }}>
                          {c.email ?? "—"}
                        </td>
                        <td>
                          <span className={`status-pill ${c.active ? "status-fulfilled" : "status-cancelled"}`}>
                            {c.active ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={5} style={{ padding: 0 }}>
                            <CustomerExpandRow
                              customer={c}
                              onFullEdit={() => { setExpandedId(null); openEdit(c.id); }}
                              onClose={() => setExpandedId(null)}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <PaginationBar total={filteredTotal} page={page} size={size} currentParams={currentParams} />
        </div>
      )}

      {/* Mobile cards */}
      {customers.length > 0 && (
        <div id="customers-card-view">
          {customers.map((c) => (
            <div
              key={c.id}
              className="material-card"
              style={{
                opacity: c.active ? 1 : 0.55,
                cursor: "pointer",
              }}
              onClick={() => openEdit(c.id)}
            >
              <div className="material-card-face" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ fontWeight: 700, color: "#F0EDE6", fontSize: "0.85rem" }}>{c.name}</p>
                  <p style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.55)", marginTop: "0.2rem" }}>{c.phone}</p>
                  {c.email && <p style={{ fontSize: "0.68rem", color: "rgba(240,237,230,0.38)", marginTop: "0.15rem" }}>{c.email}</p>}
                </div>
                <span className={`status-pill ${c.active ? "status-fulfilled" : "status-cancelled"}`}>
                  {c.active ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>
            </div>
          ))}
          <PaginationBar total={filteredTotal} page={page} size={size} currentParams={currentParams} />
        </div>
      )}

      <CustomerSlideOver open={slideOpen} onClose={closeSlide} existing={editTarget} />
    </div>
  );
}
