import React from "react";

interface StatChipProps {
  label: string;
  value: number | string;
  color?: string;
  icon?: React.ReactNode;
  pulse?: boolean;
}

export default function StatChip({ label, value, color, icon, pulse }: StatChipProps) {
  return (
    <div className={`stat-strip-chip${pulse ? " low-stock" : ""}`}>
      {icon}
      <span className="value" style={color ? { color } : undefined}>{value}</span>
      <span>{label}</span>
    </div>
  );
}
