import { asc, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  exercises,
  routineExercises,
  routines,
  type Exercise,
  type Routine,
  type RoutineExercise,
} from "@/db/schema";

export interface RoutineExerciseInput {
  exerciseId: string;
  targetSets?: number;
  targetReps?: number;
  targetWeight?: number;
  restSeconds?: number;
}

export interface RoutinePatch {
  name?: string;
  note?: string | null;
  sortOrder?: number;
}

export interface RoutineExercisePatch {
  targetSets?: number | null;
  targetReps?: number | null;
  targetWeight?: number | null;
  restSeconds?: number | null;
}

export const routinesRepo = {
  create(input: {
    name: string;
    note?: string;
    exercises?: RoutineExerciseInput[];
  }): number {
    const now = Date.now();
    return db.transaction((tx) => {
      const inserted = tx
        .insert(routines)
        .values({
          name: input.name,
          note: input.note ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: routines.id })
        .get();

      const routineId = inserted.id;

      const list = input.exercises ?? [];
      list.forEach((ex, index) => {
        tx.insert(routineExercises)
          .values({
            routineId,
            exerciseId: ex.exerciseId,
            position: index,
            targetSets: ex.targetSets ?? null,
            targetReps: ex.targetReps ?? null,
            targetWeight: ex.targetWeight ?? null,
            restSeconds: ex.restSeconds ?? null,
          })
          .run();
      });

      return routineId;
    });
  },

  update(id: number, patch: RoutinePatch): void {
    db.update(routines)
      .set({ ...patch, updatedAt: Date.now() })
      .where(eq(routines.id, id))
      .run();
  },

  delete(id: number): void {
    db.delete(routines).where(eq(routines.id, id)).run();
  },

  reorderExercises(routineId: number, orderedRoutineExerciseIds: number[]): void {
    db.transaction((tx) => {
      orderedRoutineExerciseIds.forEach((reId, index) => {
        tx.update(routineExercises)
          .set({ position: index })
          .where(eq(routineExercises.id, reId))
          .run();
      });
      tx.update(routines)
        .set({ updatedAt: Date.now() })
        .where(eq(routines.id, routineId))
        .run();
    });
  },

  addExercise(routineId: number, exercise: RoutineExerciseInput): number {
    return db.transaction((tx) => {
      const last = tx
        .select({ position: routineExercises.position })
        .from(routineExercises)
        .where(eq(routineExercises.routineId, routineId))
        .orderBy(desc(routineExercises.position))
        .get();
      const nextPosition = last ? last.position + 1 : 0;

      const inserted = tx
        .insert(routineExercises)
        .values({
          routineId,
          exerciseId: exercise.exerciseId,
          position: nextPosition,
          targetSets: exercise.targetSets ?? null,
          targetReps: exercise.targetReps ?? null,
          targetWeight: exercise.targetWeight ?? null,
          restSeconds: exercise.restSeconds ?? null,
        })
        .returning({ id: routineExercises.id })
        .get();

      tx.update(routines)
        .set({ updatedAt: Date.now() })
        .where(eq(routines.id, routineId))
        .run();

      return inserted.id;
    });
  },

  updateExercise(routineExerciseId: number, patch: RoutineExercisePatch): void {
    db.update(routineExercises)
      .set(patch)
      .where(eq(routineExercises.id, routineExerciseId))
      .run();
  },

  removeExercise(routineExerciseId: number): void {
    db.delete(routineExercises)
      .where(eq(routineExercises.id, routineExerciseId))
      .run();
  },

  list(): Routine[] {
    return db
      .select()
      .from(routines)
      .orderBy(asc(routines.sortOrder), desc(routines.updatedAt))
      .all();
  },

  getById(id: number):
    | { routine: Routine; exercises: (RoutineExercise & { exercise: Exercise })[] }
    | undefined {
    const routine = db
      .select()
      .from(routines)
      .where(eq(routines.id, id))
      .get();
    if (!routine) return undefined;

    const rows = db
      .select({ routineExercise: routineExercises, exercise: exercises })
      .from(routineExercises)
      .innerJoin(exercises, eq(routineExercises.exerciseId, exercises.id))
      .where(eq(routineExercises.routineId, id))
      .orderBy(asc(routineExercises.position))
      .all();

    return {
      routine,
      exercises: rows.map((row) => ({
        ...row.routineExercise,
        exercise: row.exercise,
      })),
    };
  },
};
