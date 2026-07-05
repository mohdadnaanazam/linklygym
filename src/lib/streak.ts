const MS_PER_DAY = 24 * 60 * 60 * 1000;

function localDayIndex(at: number): number {
  const d = new Date(at);
  const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor(local.getTime() / MS_PER_DAY);
}

export function computeStreaks(
  workoutTimestamps: number[],
  now: number = Date.now()
): { current: number; longest: number } {
  if (workoutTimestamps.length === 0) {
    return { current: 0, longest: 0 };
  }

  const days = [...new Set(workoutTimestamps.map(localDayIndex))].sort(
    (a, b) => a - b
  );

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    if (days[i] === days[i - 1] + 1) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
  }

  const today = localDayIndex(now);
  const daySet = new Set(days);
  let current = 0;
  let cursor: number;
  if (daySet.has(today)) {
    cursor = today;
  } else if (daySet.has(today - 1)) {
    cursor = today - 1;
  } else {
    return { current: 0, longest };
  }
  while (daySet.has(cursor)) {
    current += 1;
    cursor -= 1;
  }

  return { current, longest };
}
