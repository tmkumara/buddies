"use client";

import { useState } from "react";

export interface UnitInputProps {
  labelPrefix: string;
  nameCm: string;
  nameIn: string;
  defaultValueCm?: number | null;
  defaultValueIn?: number | null;
  required?: boolean;
  step?: string;
}

export default function UnitInput({
  labelPrefix,
  nameCm,
  nameIn,
  defaultValueCm,
  defaultValueIn,
  required,
  step = "0.01",
}: UnitInputProps) {
  const [unit, setUnit] = useState<"in" | "cm">(
    defaultValueIn != null ? "in" : defaultValueCm != null ? "cm" : "in"
  );

  const isIn = unit === "in";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.45rem" }}>
        <label className="form-label" style={{ margin: 0 }}>
          {labelPrefix}{required && " *"}
        </label>
        <div className="unit-toggle">
          <button
            type="button"
            className={`unit-toggle-btn${isIn ? " active" : ""}`}
            onClick={() => setUnit("in")}
          >
            IN
          </button>
          <button
            type="button"
            className={`unit-toggle-btn${!isIn ? " active" : ""}`}
            onClick={() => setUnit("cm")}
          >
            CM
          </button>
        </div>
      </div>

      {isIn ? (
        <>
          <input
            name={nameIn}
            type="number"
            step={step}
            min="0"
            className="form-input"
            defaultValue={defaultValueIn ?? undefined}
            required={required}
            placeholder="0.00"
          />
          <input type="hidden" name={nameCm} value={defaultValueCm ?? ""} />
        </>
      ) : (
        <>
          <input
            name={nameCm}
            type="number"
            step={step}
            min="0"
            className="form-input"
            defaultValue={defaultValueCm ?? undefined}
            required={required}
            placeholder="0.00"
          />
          <input type="hidden" name={nameIn} value={defaultValueIn ?? ""} />
        </>
      )}
    </div>
  );
}
