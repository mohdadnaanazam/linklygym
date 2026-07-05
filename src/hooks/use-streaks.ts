import { useCallback, useMemo, useState } from 'react';

import { workoutsRepo } from '@/db/repositories';
import { computeStreaks } from '@/lib/streak';

export function dayKey(at: number): string {
  const d = new Date(at);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface UseStreaksResult {
  current: number;
  longest: number;
  workoutDays: Set<string>;
  reload: () => void;
}

export function useStreaks(): UseStreaksResult {
  const [timestamps, setTimestamps] = useState<number[]>(() =>
    workoutsRepo.list().map((w) => w.startedAt)
  );

  const reload = useCallback(() => {
    setTimestamps(workoutsRepo.list().map((w) => w.startedAt));
  }, []);

  const { current, longest } = useMemo(
    () => computeStreaks(timestamps),
    [timestamps]
  );

  const workoutDays = useMemo(
    () => new Set(timestamps.map(dayKey)),
    [timestamps]
  );

  return { current, longest, workoutDays, reload };
}

export default useStreaks;
