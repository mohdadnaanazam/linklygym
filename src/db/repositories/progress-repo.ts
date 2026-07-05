import { and, asc, desc, eq, gte, lte } from "drizzle-orm";

import { db } from "@/db/client";
import { estimate1RM } from "@/lib/one-rep-max";
import type { PrMetric } from "@/lib/pr";
import { sessionVolume, volumeByDay, type DatedVolume } from "@/lib/volume";
import {
  personalRecords,
  workoutExercises,
  workoutSets,
  workouts,
  type PersonalRecord,
} from "@/db/schema";

export interface DateRange {
  start?: number;
  end?: number;
}

export interface ExerciseHistoryPoint {
  at: number;
  topSetKg: number;
  est1RM: number;
  volume: number;
}

function completedInRange(range?: DateRange) {
  const conditions = [eq(workouts.status, "completed")];
  if (range?.start !== undefined) {
    conditions.push(gte(workouts.startedAt, range.start));
  }
  if (range?.end !== undefined) {
    conditions.push(lte(workouts.startedAt, range.end));
  }
  return conditions;
}

export const progressRepo = {
  exerciseHistory(
    exerciseId: string,
    range?: DateRange
  ): ExerciseHistoryPoint[] {
    const rows = db
      .select({
        workoutId: workouts.id,
        at: workouts.startedAt,
        weight: workoutSets.weight,
        reps: workoutSets.reps,
        completed: workoutSets.completed,
      })
      .from(workoutSets)
      .innerJoin(
        workoutExercises,
        eq(workoutSets.workoutExerciseId, workoutExercises.id)
      )
      .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
      .where(
        and(
          eq(workoutExercises.exerciseId, exerciseId),
          ...completedInRange(range)
        )
      )
      .orderBy(asc(workouts.startedAt))
      .all();

    const byWorkout = new Map<
      number,
      { at: number; sets: { weightKg: number; reps: number; completed: boolean }[] }
    >();
    for (const row of rows) {
      let entry = byWorkout.get(row.workoutId);
      if (!entry) {
        entry = { at: row.at, sets: [] };
        byWorkout.set(row.workoutId, entry);
      }
      entry.sets.push({
        weightKg: row.weight ?? 0,
        reps: row.reps ?? 0,
        completed: row.completed ?? false,
      });
    }

    const points: ExerciseHistoryPoint[] = [];
    for (const { at, sets } of byWorkout.values()) {
      const completed = sets.filter((s) => s.completed);
      const topSetKg = completed.reduce((m, s) => Math.max(m, s.weightKg), 0);
      const est1RM = completed.reduce(
        (m, s) => Math.max(m, estimate1RM(s.weightKg, s.reps)),
        0
      );
      const volume = sessionVolume(completed);
      points.push({ at, topSetKg, est1RM, volume });
    }

    return points.sort((a, b) => b.at - a.at);
  },

  personalRecords(exerciseId: string): PersonalRecord[] {
    return db
      .select()
      .from(personalRecords)
      .where(eq(personalRecords.exerciseId, exerciseId))
      .orderBy(desc(personalRecords.achievedAt))
      .all();
  },

  recordPR(
    exerciseId: string,
    metric: PrMetric,
    value: number,
    workoutId: number
  ): number {
    const inserted = db
      .insert(personalRecords)
      .values({
        exerciseId,
        metric,
        value,
        workoutId,
        achievedAt: Date.now(),
      })
      .returning({ id: personalRecords.id })
      .get();
    return inserted.id;
  },

  bestByMetric(exerciseId: string): Partial<Record<PrMetric, number>> {
    const rows = db
      .select({
        metric: personalRecords.metric,
        value: personalRecords.value,
      })
      .from(personalRecords)
      .where(eq(personalRecords.exerciseId, exerciseId))
      .all();

    const bests: Partial<Record<PrMetric, number>> = {};
    for (const row of rows) {
      const current = bests[row.metric];
      if (current === undefined || row.value > current) {
        bests[row.metric] = row.value;
      }
    }
    return bests;
  },

  volumeByRange(range?: DateRange): { day: string; volume: number }[] {
    const rows = db
      .select({
        at: workouts.startedAt,
        weight: workoutSets.weight,
        reps: workoutSets.reps,
        completed: workoutSets.completed,
      })
      .from(workoutSets)
      .innerJoin(
        workoutExercises,
        eq(workoutSets.workoutExerciseId, workoutExercises.id)
      )
      .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
      .where(and(...completedInRange(range)))
      .all();

    const entries: DatedVolume[] = rows
      .filter((r) => r.completed ?? false)
      .map((r) => ({
        at: r.at,
        volume: (r.weight ?? 0) * (r.reps ?? 0),
      }));

    return volumeByDay(entries);
  },
};
