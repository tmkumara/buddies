export function calculateRawArea(
  cutLengthCm: number | null | undefined,
  cutWidthCm:  number | null | undefined,
): number | null {
  if (cutLengthCm == null || cutWidthCm == null) return null;
  return cutLengthCm * cutWidthCm;
}

export function calculateLineTotal(unitPrice: number, quantity: number): number {
  return Math.round(unitPrice * quantity * 100) / 100;
}

export function calculateQuantityDiscount(totalQty: number): number {
  if (totalQty >= 100) return 0.10;
  if (totalQty >= 50)  return 0.07;
  return 0;
}

export function calculateOrderTotals(
  items: { unitPrice: number; quantity: number }[],
  discountOverride?: number | null,
  deliveryCharge?: number | null,
): { totalAmount: number; discountAmount: number; netAmount: number; discountPercent: number; deliveryCharge: number } {
  const totalAmount = items.reduce(
    (sum, item) => sum + calculateLineTotal(item.unitPrice, item.quantity),
    0,
  );
  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);

  const discountPercent = discountOverride != null
    ? discountOverride
    : calculateQuantityDiscount(totalQty) * 100;

  const discountAmount = Math.round(totalAmount * (discountPercent / 100) * 100) / 100;
  const delivery       = Math.round((deliveryCharge ?? 0) * 100) / 100;
  const netAmount      = Math.round((totalAmount - discountAmount + delivery) * 100) / 100;

  return { totalAmount, discountAmount, netAmount, discountPercent, deliveryCharge: delivery };
}

export function toNumber(value: { toString(): string } | number | string): number {
  return typeof value === "number" ? value : Number(value);
}
