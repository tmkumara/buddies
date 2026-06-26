export interface BoxDims {
  sheetLengthIn?: number | null;
  sheetWidthIn?:  number | null;
  sheetLengthCm?: number | null;
  sheetWidthCm?:  number | null;
  cutLengthIn?:   number | null;
  cutWidthIn?:    number | null;
  cutLengthCm?:   number | null;
  cutWidthCm?:    number | null;
}

export function calculateBoxesPerSheet(dims: BoxDims): number {
  // Use inches first (sheetLengthIn, sheetWidthIn, cutLengthIn, cutWidthIn)
  // Fall back to cm if any inch value is null/undefined
  // boxes_per_sheet = floor(sheetL / cutL) * floor(sheetW / cutW)
  // Return 0 if any required dimension is missing or cutL/cutW is zero
  const sheetL = dims.sheetLengthIn ?? dims.sheetLengthCm;
  const sheetW = dims.sheetWidthIn  ?? dims.sheetWidthCm;
  const cutL   = dims.cutLengthIn   ?? dims.cutLengthCm;
  const cutW   = dims.cutWidthIn    ?? dims.cutWidthCm;

  if (!sheetL || !sheetW || !cutL || !cutW || cutL <= 0 || cutW <= 0) return 0;

  return Math.floor(sheetL / cutL) * Math.floor(sheetW / cutW);
}

export function calculateMaterialCostPerBox(
  materialUnitPrice: number,
  boxesPerSheet: number,
): number {
  if (boxesPerSheet <= 0) return 0;
  return Math.round((materialUnitPrice / boxesPerSheet) * 100) / 100;
}

export function calculateSuggestedUnitPrice(
  materialCostPerBox: number,
  addOnCost: number,
): number {
  return Math.round((materialCostPerBox + addOnCost) * 100) / 100;
}

export function calculateTrueCostPerBox(
  materialCostPerSheet: number,
  boxesPerSheet: number,
): number {
  if (boxesPerSheet <= 0) return 0;
  return Math.round((materialCostPerSheet / boxesPerSheet) * 100) / 100;
}

export function calculateSheetsNeeded(quantity: number, boxesPerSheet: number): number {
  if (boxesPerSheet <= 0) return 0;
  return Math.ceil(quantity / boxesPerSheet);
}
