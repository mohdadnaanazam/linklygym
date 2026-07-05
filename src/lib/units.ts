export type WeightUnit = 'kg' | 'lb';

const KG_TO_LB_FACTOR = 2.2046226218;

export function kgToLb(kg: number): number {
  return kg * KG_TO_LB_FACTOR;
}

export function lbToKg(lb: number): number {
  return lb / KG_TO_LB_FACTOR;
}

export function toDisplay(kg: number, unit: WeightUnit): number {
  return unit === 'lb' ? kgToLb(kg) : kg;
}

export function fromDisplay(value: number, unit: WeightUnit): number {
  return unit === 'lb' ? lbToKg(value) : value;
}

function roundTrim(value: number, decimals: number): string {
  const factor = Math.pow(10, decimals);
  const rounded = Math.round(value * factor) / factor;
  return String(parseFloat(rounded.toFixed(decimals)));
}

export function formatWeight(
  kg: number,
  unit: WeightUnit,
  opts?: { decimals?: number; withUnit?: boolean }
): string {
  const decimals = opts?.decimals ?? 1;
  const withUnit = opts?.withUnit ?? true;
  const display = roundTrim(toDisplay(kg, unit), decimals);
  return withUnit ? `${display} ${unit}` : display;
}
