import React from "react";

interface StatChipProps {
  label: string;
  value: number | string;
  color?: string;
  // Accepts a Lucide-style icon component OR a pre-rendered ReactNode
  icon?: React.ComponentType<{ size?: number }> | React.ReactNode;
  pulse?: boolean;
}

export default function StatChip({ label, value, color, icon, pulse }: StatChipProps) {
  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    // Treat as a component type (e.g. Lucide ForwardRefExoticComponent)
    const Icon = icon as React.ComponentType<{ size?: number }>;
    return <Icon size={12} />;
  };

  return (
    <div className={`stat-strip-chip${pulse ? " low-stock" : ""}`}>
      {renderIcon()}
      <span className="value" style={color ? { color } : undefined}>{value}</span>
      <span>{label}</span>
    </div>
  );
}
