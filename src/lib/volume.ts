export function setVolume(weightKg: number, reps: number): number {
  if (weightKg < 0 || reps < 0) return 0;
  return weightKg * reps;
}

export function sessionVolume(
  sets: { weightKg: number; reps: number; completed?: boolean }[]
): number {
  return sets.reduce((total, s) => {
    if (s.completed === false) return total;
    return total + setVolume(s.weightKg, s.reps);
  }, 0);
}

export interface DatedVolume {
  at: number;
  volume: number;
}

function localDay(at: number): string {
  const d = new Date(at);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function volumeByDay(
  entries: DatedVolume[]
): { day: string; volume: number }[] {
  const byDay = new Map<string, number>();
  for (const entry of entries) {
    const day = localDay(entry.at);
    byDay.set(day, (byDay.get(day) ?? 0) + entry.volume);
  }
  return [...byDay.entries()]
    .map(([day, volume]) => ({ day, volume }))
    .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
}
