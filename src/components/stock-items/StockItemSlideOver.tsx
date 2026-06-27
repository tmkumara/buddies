"use client";

import { useRef, useTransition } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createStockItem, updateStockItem, toggleStockItemActive } from "@/actions/stock-items";
import type { StockItemRow } from "./StockItemsClient";

interface Props {
  isOpen: boolean;
  editItem: StockItemRow | null;
  onClose: () => void;
}

export default function StockItemSlideOver({ isOpen, editItem, onClose }: Props) {
  const router      = useRouter();
  const formRef     = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  const inp: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(245,182,30,0.14)", borderRadius: "0.5rem",
    padding: "0.6rem 0.9rem", color: "#F0EDE6", fontSize: "0.82rem", outline: "none",
  };
  const lbl: React.CSSProperties = {
    fontSize: "0.62rem", letterSpacing: "0.08em", color: "rgba(240,237,230,0.4)",
    display: "block", marginBottom: "0.4rem",
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(formRef.current!);
    startTransition(async () => {
      const result = editItem
        ? await updateStockItem(editItem.id, fd)
        : await createStockItem(fd);
      if ("error" in result && result.error) {
        alert(result.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  async function handleToggleActive() {
    if (!editItem) return;
    await toggleStockItemActive(editItem.id, !editItem.active);
    router.refresh();
    onClose();
  }

  if (!isOpen) return null;

  return (
    <>
      <div className="slide-overlay" onClick={onClose} />
      <div className="slide-panel">
        <div className="slide-header">
          <h2 className="slide-title">{editItem ? "Edit Stock Item" : "New Stock Item"}</h2>
          <button onClick={onClose} className="slide-close"><X size={18} /></button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={lbl}>CODE</label>
            <input name="code" required maxLength={50} defaultValue={editItem?.code ?? ""} style={inp} />
          </div>
          <div>
            <label style={lbl}>NAME</label>
            <input name="name" required maxLength={150} defaultValue={editItem?.name ?? ""} style={inp} />
          </div>
          <div>
            <label style={lbl}>DESCRIPTION (optional)</label>
            <input name="description" maxLength={255} defaultValue={editItem?.description ?? ""} style={inp} />
          </div>
          <div>
            <label style={lbl}>STOCK UNIT</label>
            <input name="stockUnit" required maxLength={50} placeholder="e.g. boxes, liters, meters" defaultValue={editItem?.stockUnit ?? ""} style={inp} />
            <p style={{ fontSize: "0.6rem", color: "rgba(240,237,230,0.3)", marginTop: "0.3rem" }}>
              Used as the label throughout the stock UI — be precise (e.g. "boxes" not "box")
            </p>
          </div>
          <div>
            <label style={lbl}>UNIT PRICE (Rs.)</label>
            <input name="unitPrice" type="number" min="0" step="0.01" required defaultValue={editItem?.unitPrice ?? 0} style={inp} />
          </div>
          <div>
            <label style={lbl}>MIN STOCK (low-stock threshold)</label>
            <input name="minStock" type="number" min="0" step="0.01" defaultValue={editItem?.minStock ?? 0} style={inp} />
          </div>

          <button type="submit" className="submit-btn" disabled={pending} style={{ marginTop: "0.5rem" }}>
            {pending ? "SAVING…" : editItem ? "SAVE CHANGES" : "CREATE STOCK ITEM"}
          </button>

          {editItem && (
            <button
              type="button"
              onClick={handleToggleActive}
              style={{
                background: "none", border: `1px solid ${editItem.active ? "rgba(248,113,113,0.3)" : "rgba(74,222,128,0.3)"}`,
                borderRadius: "0.5rem", padding: "0.6rem", color: editItem.active ? "#F87171" : "#4ADE80",
                fontSize: "0.72rem", letterSpacing: "0.07em", cursor: "pointer",
              }}
            >
              {editItem.active ? "DEACTIVATE" : "REACTIVATE"}
            </button>
          )}
        </form>
      </div>
    </>
  );
}
