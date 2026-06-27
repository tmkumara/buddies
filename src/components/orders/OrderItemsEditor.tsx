"use client";

import { useState } from "react";
import { Plus, Trash2, Sparkles, AlertTriangle } from "lucide-react";
import QuickCreateDesignPanel, { type DesignTypeOption, type MaterialOption } from "./QuickCreateDesignPanel";
import Combobox from "@/components/ui/Combobox";

export interface BoxTypeOption {
  id: number;
  code: string;
  name: string;
}

export interface BoxDesignOption {
  id:             number;
  code:           string;
  name:           string;
  unitPrice:      number;
  boxTypeId:      number;
  boxTypeName:    string;
}

export interface StockItemOption {
  id:           number;
  code:         string;
  name:         string;
  stockUnit:    string;
  unitPrice:    number;
  currentStock: number;
}

export interface OrderItem {
  key:          string;
  boxDesignId:  number;    // 0 = unset
  stockItemId:  number;    // 0 = unset (exactly one of boxDesignId/stockItemId will be non-zero)
  designName:   string;
  designCode:   string;
  quantity:     number;
  unitPrice:    number;
  lineTotal:    number;
}

interface Props {
  boxTypes:     BoxTypeOption[];
  boxDesigns:   BoxDesignOption[];
  designTypes:  DesignTypeOption[];
  materials:    MaterialOption[];
  stockItems?:  StockItemOption[];
  isAdmin:      boolean;
  onChange:     (items: OrderItem[]) => void;
  initialItems?: OrderItem[];
}

let keyCounter = 0;
function nextKey() { return `item-${++keyCounter}`; }

export default function OrderItemsEditor({
  boxDesigns, designTypes, materials, stockItems = [], isAdmin, onChange, initialItems,
}: Props) {
  const [items,           setItems]           = useState<OrderItem[]>(initialItems ?? []);
  const [localDesigns,    setLocalDesigns]    = useState<BoxDesignOption[]>(boxDesigns);
  const [panelOpenForKey, setPanelOpenForKey] = useState<string | null>(null);
  // Tracks per-row item type: "design" | "stock" (needed when both IDs are 0 after type switch)
  const [rowTypes,        setRowTypes]        = useState<Record<string, "design" | "stock">>({});

  const bdMap = new Map(localDesigns.map((bd) => [bd.id, bd]));

  function update(next: OrderItem[]) { setItems(next); onChange(next); }

  function addItem() {
    const key = nextKey();
    update([...items, { key, boxDesignId: 0, stockItemId: 0, designName: "", designCode: "", quantity: 1, unitPrice: 0, lineTotal: 0 }]);
  }

  function removeItem(key: string) {
    setRowTypes((prev) => { const n = { ...prev }; delete n[key]; return n; });
    update(items.filter((i) => i.key !== key));
  }

  function handleItemTypeChange(key: string, newType: "design" | "stock") {
    setRowTypes((prev) => ({ ...prev, [key]: newType }));
    // Reset IDs and price when type switches
    update(items.map((i) => i.key !== key ? i : {
      ...i,
      boxDesignId: 0, stockItemId: 0,
      designName: "", designCode: "", unitPrice: 0, lineTotal: 0,
    }));
  }

  function handleBoxDesignChange(key: string, rawId: string) {
    const id = Number(rawId);
    const bd = bdMap.get(id);
    update(items.map((i) => {
      if (i.key !== key) return i;
      const unitPrice = bd?.unitPrice ?? 0;
      return {
        ...i, boxDesignId: id, stockItemId: 0,
        designName:  bd?.name  ?? "",
        designCode:  bd?.code  ?? "",
        unitPrice,
        lineTotal: Math.round(unitPrice * i.quantity * 100) / 100,
      };
    }));
  }

  function handleStockItemChange(key: string, rawId: string) {
    const id = Number(rawId);
    const si = stockItems.find((s) => s.id === id);
    update(items.map((i) => {
      if (i.key !== key) return i;
      const unitPrice = si?.unitPrice ?? 0;
      return {
        ...i,
        boxDesignId: 0,
        stockItemId: id,
        designName:  si?.name  ?? "",
        designCode:  si?.code  ?? "",
        unitPrice,
        lineTotal: Math.round(unitPrice * i.quantity * 100) / 100,
      };
    }));
  }

  function handleQtyChange(key: string, rawQty: string) {
    const qty = Math.max(1, parseInt(rawQty) || 1);
    update(items.map((i) => {
      if (i.key !== key) return i;
      return { ...i, quantity: qty, lineTotal: Math.round(i.unitPrice * qty * 100) / 100 };
    }));
  }

  function handlePriceChange(key: string, rawPrice: string) {
    if (!isAdmin) return;
    const price = Math.max(0, parseFloat(rawPrice) || 0);
    update(items.map((i) => {
      if (i.key !== key) return i;
      return { ...i, unitPrice: price, lineTotal: Math.round(price * i.quantity * 100) / 100 };
    }));
  }

  function handleDesignCreated(newDesign: BoxDesignOption) {
    setLocalDesigns((prev) => [...prev, newDesign]);
    if (panelOpenForKey) handleBoxDesignChange(panelOpenForKey, String(newDesign.id));
  }

  const th: React.CSSProperties = {
    padding: "0.55rem 0.75rem", fontSize: "0.62rem", letterSpacing: "0.1em",
    color: "rgba(240,237,230,0.3)", fontWeight: 600, textAlign: "left",
    borderBottom: "1px solid rgba(245,182,30,0.08)", whiteSpace: "nowrap",
  };
  const td: React.CSSProperties = {
    padding: "0.5rem 0.6rem", borderBottom: "1px solid rgba(245,182,30,0.05)", verticalAlign: "middle",
  };
  const sel: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(245,182,30,0.14)", borderRadius: "0.4rem",
    padding: "0.45rem 0.6rem", color: "#F0EDE6", fontSize: "0.78rem", outline: "none",
  };

  return (
    <>
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <span style={{ fontSize: "0.72rem", letterSpacing: "0.08em", color: "rgba(240,237,230,0.35)" }}>ORDER ITEMS</span>
          <button type="button" onClick={addItem} className="cta-btn" style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.68rem", padding: "0.4rem 0.85rem" }}>
            <Plus size={12} /> Add Item
          </button>
        </div>

        {items.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", fontSize: "0.78rem", color: "rgba(240,237,230,0.2)", border: "1px dashed rgba(245,182,30,0.12)", borderRadius: "0.5rem" }}>
            No items yet — click Add Item
          </div>
        ) : (
          <div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...th, width: "130px" }}>ITEM TYPE</th>
                  <th style={th}>ITEM</th>
                  <th style={{ ...th, width: "80px" }}>QTY</th>
                  <th style={{ ...th, width: "110px" }}>UNIT PRICE</th>
                  <th style={{ ...th, width: "110px", textAlign: "right" }}>LINE TOTAL</th>
                  <th style={{ ...th, width: "40px" }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  // Determine current row mode: stock if stockItemId>0, else check rowTypes, else default "design"
                  const itemType: "design" | "stock" =
                    item.stockItemId > 0 ? "stock" : (rowTypes[item.key] ?? "design");
                  const qtyWarn = item.quantity > 0 && item.quantity < 10;

                  return (
                    <tr key={item.key}>
                      {/* ITEM TYPE selector */}
                      <td style={td}>
                        <select
                          value={itemType}
                          onChange={(e) => handleItemTypeChange(item.key, e.target.value as "design" | "stock")}
                          style={sel}
                        >
                          <option value="design">Box Design</option>
                          <option value="stock">Stock Item</option>
                        </select>
                      </td>

                      {/* ITEM picker — design or stock branch */}
                      <td style={td}>
                        {itemType === "stock" ? (
                          <Combobox
                            name={`__stock_${item.key}`}
                            placeholder="— Select Stock Item —"
                            value={item.stockItemId || ""}
                            options={stockItems.map((si) => ({
                              value: si.id,
                              label: si.code,
                              meta:  `${si.name} (${si.currentStock} ${si.stockUnit})`,
                            }))}
                            onChange={(v) => handleStockItemChange(item.key, String(v))}
                          />
                        ) : (
                          <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                            <div style={{ flex: 1 }}>
                              <Combobox
                                name={`__design_${item.key}`}
                                placeholder="— Select Design —"
                                value={item.boxDesignId || ""}
                                options={localDesigns.map((bd) => ({ value: bd.id, label: bd.code, meta: bd.name }))}
                                onChange={(v) => handleBoxDesignChange(item.key, String(v))}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => setPanelOpenForKey(item.key)}
                              title="Create new design"
                              style={{ background: "rgba(245,182,30,0.07)", border: "1px solid rgba(245,182,30,0.2)", borderRadius: "0.4rem", padding: "0.4rem 0.5rem", color: "rgba(245,182,30,0.7)", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center" }}
                            >
                              <Sparkles size={13} />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* QTY */}
                      <td style={td}>
                        <div>
                          <input
                            type="number" min="1" step="1" value={item.quantity}
                            onChange={(e) => handleQtyChange(item.key, e.target.value)}
                            required
                            style={{ ...sel, width: "100%", borderColor: qtyWarn ? "rgba(251,191,36,0.4)" : "rgba(245,182,30,0.14)" }}
                          />
                          {qtyWarn && (
                            <p style={{ fontSize: "0.55rem", color: "#FBBF24", marginTop: "0.15rem", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                              <AlertTriangle size={9} /> Min 10 recommended
                            </p>
                          )}
                        </div>
                      </td>

                      {/* UNIT PRICE */}
                      <td style={td}>
                        <input
                          type="number" min="0" step="0.01" value={item.unitPrice}
                          onChange={(e) => handlePriceChange(item.key, e.target.value)}
                          readOnly={!isAdmin}
                          title={!isAdmin ? "Only admins can override unit price" : undefined}
                          style={{ ...sel, width: "100%", cursor: isAdmin ? "text" : "not-allowed", opacity: isAdmin ? 1 : 0.7 }}
                        />
                      </td>

                      {/* LINE TOTAL */}
                      <td style={{ ...td, textAlign: "right", color: "#F5B61E", fontWeight: 600, fontSize: "0.85rem" }}>
                        {item.lineTotal.toFixed(2)}
                      </td>

                      {/* REMOVE */}
                      <td style={{ ...td, textAlign: "center" }}>
                        <button type="button" onClick={() => removeItem(item.key)} style={{ background: "none", border: "none", cursor: "pointer", padding: "0.2rem", color: "#F87171" }} title="Remove">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <QuickCreateDesignPanel
        isOpen={panelOpenForKey !== null}
        onClose={() => setPanelOpenForKey(null)}
        onCreated={handleDesignCreated}
        designTypes={designTypes}
        initialMaterials={materials}
      />
    </>
  );
}
