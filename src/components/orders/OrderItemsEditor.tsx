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

export interface OrderItem {
  key:          string;
  boxDesignId:  number;
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
  isAdmin:      boolean;
  onChange:     (items: OrderItem[]) => void;
  initialItems?: OrderItem[];
}

let keyCounter = 0;
function nextKey() { return `item-${++keyCounter}`; }

export default function OrderItemsEditor({
  boxTypes, boxDesigns, designTypes, materials, isAdmin, onChange, initialItems,
}: Props) {
  const [items,           setItems]           = useState<OrderItem[]>(initialItems ?? []);
  const [localDesigns,    setLocalDesigns]    = useState<BoxDesignOption[]>(boxDesigns);
  const [panelOpenForKey, setPanelOpenForKey] = useState<string | null>(null);
  const [selectedTypes,   setSelectedTypes]   = useState<Record<string, number>>({});

  const bdMap = new Map(localDesigns.map((bd) => [bd.id, bd]));

  function update(next: OrderItem[]) { setItems(next); onChange(next); }

  function addItem() {
    const key = nextKey();
    update([...items, { key, boxDesignId: 0, designName: "", designCode: "", quantity: 1, unitPrice: 0, lineTotal: 0 }]);
  }

  function removeItem(key: string) { update(items.filter((i) => i.key !== key)); }

  function handleTypeChange(key: string, typeId: string) {
    setSelectedTypes((prev) => ({ ...prev, [key]: Number(typeId) }));
    // Reset design when type changes
    update(items.map((i) => i.key !== key ? i : {
      ...i, boxDesignId: 0, designName: "", designCode: "", unitPrice: 0, lineTotal: 0,
    }));
  }

  function handleBoxDesignChange(key: string, rawId: string) {
    const id = Number(rawId);
    const bd = bdMap.get(id);
    update(items.map((i) => {
      if (i.key !== key) return i;
      const unitPrice = bd?.unitPrice ?? 0;
      return {
        ...i, boxDesignId: id,
        designName:  bd?.name  ?? "",
        designCode:  bd?.code  ?? "",
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
                  <th style={th}>BOX TYPE</th>
                  <th style={th}>BOX DESIGN</th>
                  <th style={{ ...th, width: "80px" }}>QTY</th>
                  <th style={{ ...th, width: "110px" }}>UNIT PRICE</th>
                  <th style={{ ...th, width: "110px", textAlign: "right" }}>LINE TOTAL</th>
                  <th style={{ ...th, width: "40px" }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const typeId = selectedTypes[item.key] ?? 0;
                  const filteredDesigns = typeId
                    ? localDesigns.filter((bd) => bd.boxTypeId === typeId)
                    : localDesigns;
                  const qtyWarn = item.quantity > 0 && item.quantity < 10;

                  return (
                    <tr key={item.key}>
                      <td style={td}>
                        <Combobox
                          name={`__type_${item.key}`}
                          placeholder="— All Types —"
                          value={typeId || ""}
                          options={[
                            { value: "", label: "— All Types —" },
                            ...boxTypes.map((bt) => ({ value: bt.id, label: `${bt.code} — ${bt.name}` })),
                          ]}
                          onChange={(v) => handleTypeChange(item.key, String(v))}
                        />
                      </td>
                      <td style={td}>
                        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                          <div style={{ flex: 1 }}>
                            <Combobox
                              name={`__design_${item.key}`}
                              placeholder="— Select Design —"
                              value={item.boxDesignId || ""}
                              options={filteredDesigns.map((bd) => ({ value: bd.id, label: bd.code, meta: bd.name }))}
                              onChange={(v) => handleBoxDesignChange(item.key, String(v))}
                            />
                          </div>
                          <button type="button" onClick={() => setPanelOpenForKey(item.key)} title="Create new design" style={{ background: "rgba(245,182,30,0.07)", border: "1px solid rgba(245,182,30,0.2)", borderRadius: "0.4rem", padding: "0.4rem 0.5rem", color: "rgba(245,182,30,0.7)", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center" }}>
                            <Sparkles size={13} />
                          </button>
                        </div>
                      </td>
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
                      <td style={td}>
                        <input
                          type="number" min="0" step="0.01" value={item.unitPrice}
                          onChange={(e) => handlePriceChange(item.key, e.target.value)}
                          readOnly={!isAdmin}
                          title={!isAdmin ? "Only admins can override unit price" : undefined}
                          style={{ ...sel, width: "100%", cursor: isAdmin ? "text" : "not-allowed", opacity: isAdmin ? 1 : 0.7 }}
                        />
                      </td>
                      <td style={{ ...td, textAlign: "right", color: "#F5B61E", fontWeight: 600, fontSize: "0.85rem" }}>
                        {item.lineTotal.toFixed(2)}
                      </td>
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
