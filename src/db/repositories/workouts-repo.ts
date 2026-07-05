import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { sessionVolume } from "@/lib/volume";
import {
  exercises,
  routineExercises,
  workoutExercises,
  workoutSets,
  workouts,
  type Exercise,
  type Workout,
  type WorkoutExercise,
  type WorkoutSet,
} from "@/db/schema";

export interface WorkoutExerciseDetail extends WorkoutExercise {
  exercise: Exercise;
  sets: WorkoutSet[];
}

export interface WorkoutDetail {
  workout: Workout;
  exercises: WorkoutExerciseDetail[];
}

export interface WorkoutSetPatch {
  reps?: number | null;
  weight?: number | null;
  completed?: boolean;
  isPr?: boolean;
}

function loadWorkoutExercises(workoutId: number): WorkoutExerciseDetail[] {
  const rows = db
    .select({ workoutExercise: workoutExercises, exercise: exercises })
    .from(workoutExercises)
    .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .where(eq(workoutExercises.workoutId, workoutId))
    .orderBy(asc(workoutExercises.position))
    .all();

  return rows.map((row) => {
    const sets = db
      .select()
      .from(workoutSets)
      .where(eq(workoutSets.workoutExerciseId, row.workoutExercise.id))
      .orderBy(asc(workoutSets.setNumber))
      .all();
    return { ...row.workoutExercise, exercise: row.exercise, sets };
  });
}

export const workoutsRepo = {
  start(routineId?: number): number {
    const now = Date.now();
    return db.transaction((tx) => {
      const inserted = tx
        .insert(workouts)
        .values({
          routineId: routineId ?? null,
          startedAt: now,
          status: "in_progress",
          totalVolume: 0,
        })
        .returning({ id: workouts.id })
        .get();

      const workoutId = inserted.id;

      if (routineId !== undefined) {
        const routineExs = tx
          .select()
          .from(routineExercises)
          .where(eq(routineExercises.routineId, routineId))
          .orderBy(asc(routineExercises.position))
          .all();

        routineExs.forEach((re, index) => {
          tx.insert(workoutExercises)
            .values({
              workoutId,
              exerciseId: re.exerciseId,
              position: index,
            })
            .run();
        });
      }

      return workoutId;
    });
  },

  getActive(): WorkoutDetail | undefined {
    const workout = db
      .select()
      .from(workouts)
      .where(eq(workouts.status, "in_progress"))
      .orderBy(desc(workouts.startedAt))
      .get();
    if (!workout) return undefined;
    return { workout, exercises: loadWorkoutExercises(workout.id) };
  },

  addExercise(workoutId: number, exerciseId: string): number {
    return db.transaction((tx) => {
      const last = tx
        .select({ position: workoutExercises.position })
        .from(workoutExercises)
        .where(eq(workoutExercises.workoutId, workoutId))
        .orderBy(desc(workoutExercises.position))
        .get();
      const nextPosition = last ? last.position + 1 : 0;

      const inserted = tx
        .insert(workoutExercises)
        .values({ workoutId, exerciseId, position: nextPosition })
        .returning({ id: workoutExercises.id })
        .get();
      return inserted.id;
    });
  },

  logSet(
    workoutExerciseId: number,
    set: { reps?: number | null; weight?: number | null; completed?: boolean }
  ): number {
    return db.transaction((tx) => {
      const last = tx
        .select({ setNumber: workoutSets.setNumber })
        .from(workoutSets)
        .where(eq(workoutSets.workoutExerciseId, workoutExerciseId))
        .orderBy(desc(workoutSets.setNumber))
        .get();
      const nextSetNumber = last ? last.setNumber + 1 : 1;

      const inserted = tx
        .insert(workoutSets)
        .values({
          workoutExerciseId,
          setNumber: nextSetNumber,
          reps: set.reps ?? null,
          weight: set.weight ?? null,
          completed: set.completed ?? false,
          createdAt: Date.now(),
        })
        .returning({ id: workoutSets.id })
        .get();
      return inserted.id;
    });
  },

  updateSet(setId: number, patch: WorkoutSetPatch): void {
    db.update(workoutSets).set(patch).where(eq(workoutSets.id, setId)).run();
  },

  removeSet(setId: number): void {
    db.delete(workoutSets).where(eq(workoutSets.id, setId)).run();
  },

  finish(id: number): void {
    const now = Date.now();
    const workout = db
      .select()
      .from(workouts)
      .where(eq(workouts.id, id))
      .get();
    if (!workout) return;

    const sets = db
      .select({ weight: workoutSets.weight, reps: workoutSets.reps })
      .from(workoutSets)
      .innerJoin(
        workoutExercises,
        eq(workoutSets.workoutExerciseId, workoutExercises.id)
      )
      .where(
        and(
          eq(workoutExercises.workoutId, id),
          eq(workoutSets.completed, true)
        )
      )
      .all();

    const totalVolume = sessionVolume(
      sets.map((s) => ({ weightKg: s.weight ?? 0, reps: s.reps ?? 0 }))
    );
    const durationSec = Math.max(
      0,
      Math.round((now - workout.startedAt) / 1000)
    );

    db.update(workouts)
      .set({ endedAt: now, durationSec, totalVolume, status: "completed" })
      .where(eq(workouts.id, id))
      .run();
  },

  cancel(id: number): void {
    db.delete(workouts).where(eq(workouts.id, id)).run();
  },

  list(): Workout[] {
    return db
      .select()
      .from(workouts)
      .where(eq(workouts.status, "completed"))
      .orderBy(desc(workouts.startedAt))
      .all();
  },

  getById(id: number): WorkoutDetail | undefined {
    const workout = db
      .select()
      .from(workouts)
      .where(eq(workouts.id, id))
      .get();
    if (!workout) return undefined;
    return { workout, exercises: loadWorkoutExercises(id) };
  },

  deleteById(id: number): void {
    db.delete(workouts).where(eq(workouts.id, id)).run();
  },
};
