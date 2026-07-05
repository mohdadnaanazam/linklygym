import { estimate1RM } from './one-rep-max';

export type PrMetric = 'max_weight' | 'est_1rm' | 'max_volume';

export interface SetInput {
  weightKg: number;
  reps: number;
}

export type Bests = Partial<Record<PrMetric, number>>;

export function computeSetMetrics(set: SetInput): Record<PrMetric, number> {
  return {
    max_weight: set.weightKg,
    est_1rm: estimate1RM(set.weightKg, set.reps),
    max_volume: set.weightKg * set.reps,
  };
}

export function detectPRs(
  set: SetInput,
  currentBests: Bests
): { metric: PrMetric; value: number }[] {
  const metrics = computeSetMetrics(set);
  const prs: { metric: PrMetric; value: number }[] = [];

  (Object.keys(metrics) as PrMetric[]).forEach((metric) => {
    const value = metrics[metric];
    const best = currentBests[metric];
    if (best === undefined) {
      if (value > 0) prs.push({ metric, value });
    } else if (value > best) {
      prs.push({ metric, value });
    }
  });

  return prs;
}
