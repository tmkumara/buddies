"use client";

import { useState } from "react";
import { Package, TrendingDown, AlertTriangle, Archive } from "lucide-react";
import StatChip from "@/components/ui/StatChip";
import StockItemSlideOver from "./StockItemSlideOver";
import StockItemExpandRow from "./StockItemExpandRow";

export interface StockItemRow {
  id: number; code: string; name: string; description: string | null;
  stockUnit: string; unitPrice: number; currentStock: number; minStock: number; active: boolean;
  stockEntries: {
    id: number; quantityChange: number; type: string;
    note: string | null; changedAt: string; changedBy: string | null;
  }[];
}

interface Props {
  items: StockItemRow[];
  stats: { total: number; inStock: number; lowStock: number; outStock: number };
}

type Filter = "all" | "in_stock" | "low_stock" | "out_of_stock";

function stockStatus(item: StockItemRow): "in_stock" | "low_stock" | "out_of_stock" {
  if (item.currentStock <= 0) return "out_of_stock";
  if (item.currentStock <= item.minStock) return "low_stock";
  return "in_stock";
}

export default function StockItemsClient({ items, stats }: Props) {
  const [filter,      setFilter]      = useState<Filter>("all");
  const [slideOpen,   setSlideOpen]   = useState(false);
  const [editItem,    setEditItem]    = useState<StockItemRow | null>(null);
  const [expandedId,  setExpandedId]  = useState<number | null>(null);

  const filtered = items.filter((item) => {
    if (filter === "all") return true;
    return stockStatus(item) === filter;
  });

  const th: React.CSSProperties = {
    padding: "0.55rem 0.85rem", fontSize: "0.6rem", letterSpacing: "0.09em",
    color: "rgba(240,237,230,0.3)", fontWeight: 600, textAlign: "left",
    borderBottom: "1px solid rgba(245,182,30,0.08)", whiteSpace: "nowrap",
  };

  return (
    <div className="module-root">
      {/* Stat strip */}
      <div className="stat-strip">
        <StatChip label="Total SKUs"  value={stats.total}    icon={Package} />
        <StatChip label="In Stock"    value={stats.inStock}  icon={Archive}        color="green" />
        <StatChip label="Low Stock"   value={stats.lowStock} icon={AlertTriangle}  color="amber" />
        <StatChip label="Out of Stock" value={stats.outStock} icon={TrendingDown}  color="red" />
      </div>

      {/* Filter tabs */}
      <div className="filter-tab-bar">
        {(["all", "in_stock", "low_stock", "out_of_stock"] as Filter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`filter-tab${filter === f ? " active" : ""}`}>
            {f === "all" ? "All" : f === "in_stock" ? "In Stock" : f === "low_stock" ? "Low Stock" : "Out of Stock"}
          </button>
        ))}
      </div>

      {/* Header bar */}
      <div className="content-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 className="section-title">Stock Items</h2>
          <button className="cta-btn" onClick={() => { setEditItem(null); setSlideOpen(true); }}>
            + New Stock Item
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">No stock items{filter !== "all" ? " in this category" : ""}.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>CODE</th>
                <th style={th}>NAME</th>
                <th style={th}>UNIT</th>
                <th style={{ ...th, textAlign: "right" }}>STOCK</th>
                <th style={{ ...th, textAlign: "right" }}>MIN</th>
                <th style={{ ...th, textAlign: "right" }}>UNIT PRICE</th>
                <th style={th}>STATUS</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const status = stockStatus(item);
                const isExpanded = expandedId === item.id;
                return (
                  <>
                    <tr
                      key={item.id}
                      style={{ cursor: "pointer", background: isExpanded ? "rgba(245,182,30,0.04)" : undefined }}
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    >
                      <td style={{ padding: "0.65rem 0.85rem", fontSize: "0.75rem", fontWeight: 700, color: "#F5B61E", letterSpacing: "0.05em" }}>{item.code}</td>
                      <td style={{ padding: "0.65rem 0.85rem", fontSize: "0.82rem" }}>{item.name}</td>
                      <td style={{ padding: "0.65rem 0.85rem", fontSize: "0.75rem", color: "rgba(240,237,230,0.5)" }}>{item.stockUnit}</td>
                      <td style={{ padding: "0.65rem 0.85rem", textAlign: "right", fontWeight: 700, fontSize: "0.9rem", color: status === "out_of_stock" ? "#F87171" : status === "low_stock" ? "#FBBF24" : "#4ADE80" }}>
                        {item.currentStock.toFixed(item.currentStock % 1 === 0 ? 0 : 2)}
                      </td>
                      <td style={{ padding: "0.65rem 0.85rem", textAlign: "right", fontSize: "0.78rem", color: "rgba(240,237,230,0.4)" }}>
                        {item.minStock.toFixed(item.minStock % 1 === 0 ? 0 : 2)}
                      </td>
                      <td style={{ padding: "0.65rem 0.85rem", textAlign: "right", fontSize: "0.82rem" }}>Rs. {item.unitPrice.toFixed(2)}</td>
                      <td style={{ padding: "0.65rem 0.85rem" }}>
                        <span style={{
                          fontSize: "0.6rem", padding: "0.2rem 0.5rem", borderRadius: "0.25rem", fontWeight: 600, letterSpacing: "0.05em",
                          background: status === "out_of_stock" ? "rgba(248,113,113,0.1)" : status === "low_stock" ? "rgba(251,191,36,0.1)" : "rgba(74,222,128,0.1)",
                          color:      status === "out_of_stock" ? "#F87171" : status === "low_stock" ? "#FBBF24" : "#4ADE80",
                        }}>
                          {status === "out_of_stock" ? "OUT OF STOCK" : status === "low_stock" ? "LOW STOCK" : "IN STOCK"}
                        </span>
                      </td>
                      <td style={{ padding: "0.65rem 0.85rem" }}>
                        <button
                          className="edit-btn"
                          onClick={(e) => { e.stopPropagation(); setEditItem(item); setSlideOpen(true); }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${item.id}-expand`}>
                        <td colSpan={8} style={{ padding: 0, background: "rgba(20,20,20,0.6)" }}>
                          <StockItemExpandRow item={item} />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <StockItemSlideOver
        isOpen={slideOpen}
        editItem={editItem}
        onClose={() => { setSlideOpen(false); setEditItem(null); }}
      />
    </div>
  );
}
