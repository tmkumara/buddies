export function calculateRawArea(cutLengthCm: number, cutWidthCm: number): number {
  return cutLengthCm * cutWidthCm;
}

export function calculateLineTotal(unitPrice: number, quantity: number): number {
  return Math.round(unitPrice * quantity * 100) / 100;
}

export function calculateOrderTotals(
  items: { unitPrice: number; quantity: number }[],
  discountPercent: number,
): { totalAmount: number; discountAmount: number; netAmount: number } {
  const totalAmount = items.reduce((sum, item) => sum + calculateLineTotal(item.unitPrice, item.quantity), 0);
  const discountAmount = Math.round(totalAmount * (discountPercent / 100) * 100) / 100;
  const netAmount = Math.round((totalAmount - discountAmount) * 100) / 100;
  return { totalAmount, discountAmount, netAmount };
}

export function toNumber(value: { toString(): string } | number | string): number {
  return typeof value === "number" ? value : Number(value);
}
