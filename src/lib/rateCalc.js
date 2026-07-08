/**
 * RateCalc — dimension conversion + fit-calculation utilities.
 *
 * All item dimensions (item_width / item_height) are stored in `item_dimension_unit`
 * (mm, cm, in, or ft). Target dimensions are entered by the user in a target unit
 * (typically ft). We convert everything to a common unit (inches) for comparison.
 */

const TO_INCHES = {
  mm: 1 / 25.4,
  cm: 1 / 2.54,
  in: 1,
  ft: 12,
};

/**
 * Convert a value from one unit to inches.
 */
export function toInches(value, unit) {
  const factor = TO_INCHES[unit];
  if (!factor) return value;
  return value * factor;
}

/**
 * Given a preset (with item_width, item_height, item_dimension_unit) and
 * a target area (targetW × targetH in targetUnit), calculate how many
 * item units fit, rounding up per row and per column.
 *
 * @returns {{ count: number, rows: number, cols: number, detail: string } | null}
 */
export function calculateFit(preset, targetW, targetH, targetUnit = "ft") {
  if (!preset || !preset.item_width || !preset.item_height || !preset.item_dimension_unit) {
    return null;
  }
  if (!targetW || !targetH || targetW <= 0 || targetH <= 0) return null;

  const itemW = toInches(preset.item_width, preset.item_dimension_unit);
  const itemH = toInches(preset.item_height, preset.item_dimension_unit);
  const targetWIn = toInches(targetW, targetUnit);
  const targetHIn = toInches(targetH, targetUnit);

  // Try both orientations and pick the one that fits more panels
  const cols1 = Math.ceil(targetWIn / itemW);
  const rows1 = Math.ceil(targetHIn / itemH);
  const count1 = cols1 * rows1;

  const cols2 = Math.ceil(targetWIn / itemH);
  const rows2 = Math.ceil(targetHIn / itemW);
  const count2 = cols2 * rows2;

  let cols, rows, count;
  if (count2 > count1) {
    cols = cols2; rows = rows2; count = count2;
  } else {
    cols = cols1; rows = rows1; count = count1;
  }

  const detail = `${targetW}${targetUnit} × ${targetH}${targetUnit} → ${cols} cols × ${rows} rows = ${count} units (${preset.item_width}${preset.item_dimension_unit} × ${preset.item_height}${preset.item_dimension_unit} each)`;

  return { count, rows, cols, detail };
}

/**
 * Build a line item object from a preset + calculation result.
 */
export function buildLineItem(preset, quantity, fitResult) {
  const qty = fitResult ? fitResult.count : quantity;
  const unitPrice = preset.base_price || 0;
  const total = qty * unitPrice;
  return {
    id: `ratecalc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    description: preset.name,
    detail: fitResult ? fitResult.detail : (preset.description || ""),
    quantity: qty,
    unit_price: unitPrice,
    total,
    is_discount: false,
    file_urls: [],
  };
}

/**
 * Parse a dimension string like "20ft x 10ft" or "20 x 10 ft" into parts.
 * @returns {{ w: number, h: number, unit: string } | null}
 */
export function parseDimensionString(str) {
  if (!str) return null;
  const cleaned = str.toLowerCase().replace(/[×]/g, "x").trim();
  // Match patterns like "20ft x 10ft", "20 x 10 ft", "20' x 10'", "20x10"
  const m = cleaned.match(/([\d.]+)\s*(?:ft|feet|')?\s*x\s*([\d.]+)\s*(?:ft|feet|')?/);
  if (!m) return null;
  const w = parseFloat(m[1]);
  const h = parseFloat(m[2]);
  const hasFt = /ft|feet|'/.test(cleaned);
  return { w, h, unit: hasFt ? "ft" : "ft" }; // default to ft
}