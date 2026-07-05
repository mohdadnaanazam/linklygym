export function estimate1RM(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps <= 1) return round2(weightKg);
  return round2(weightKg * (1 + reps / 30));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
