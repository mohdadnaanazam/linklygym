import { create } from "zustand";

import { progressRepo, workoutsRepo } from "@/db/repositories";
import type { WorkoutDetail, WorkoutSetPatch } from "@/db/repositories/workouts-repo";
import { detectPRs } from "@/lib/pr";
import type { PrMetric } from "@/lib/pr";

export interface DetectedPR {
  metric: PrMetric;
  value: number;
}

export interface LogSetInput {
  reps?: number | null;
  weight?: number | null;
}

interface SessionState {
  active: WorkoutDetail | null;
  loading: boolean;

  load: () => void;
  addExercise: (exerciseId: string) => void;
  logSet: (workoutExerciseId: number, set: LogSetInput) => DetectedPR[];
  updateSet: (setId: number, patch: WorkoutSetPatch) => void;
  removeSet: (setId: number) => void;
  finish: () => number | null;
  cancel: () => void;
  exerciseIdFor: (workoutExerciseId: number) => string | undefined;
}

function safe<T>(fn: () => T): T | undefined {
  try {
    return fn();
  } catch (error) {
    console.warn("[session-store] repository call failed", error);
    return undefined;
  }
}

export const useSessionStore = create<SessionState>((set, get) => ({
  active: null,
  loading: false,

  load: () => {
    set({ loading: true });
    const active = safe(() => workoutsRepo.getActive()) ?? null;
    set({ active, loading: false });
  },

  addExercise: (exerciseId) => {
    const workoutId = get().active?.workout.id;
    if (workoutId === undefined) return;
    safe(() => workoutsRepo.addExercise(workoutId, exerciseId));
    get().load();
  },

  logSet: (workoutExerciseId, input) => {
    const workoutId = get().active?.workout.id;
    if (workoutId === undefined) return [];

    const reps = input.reps ?? null;
    const weight = input.weight ?? null;

    const setId = safe(() =>
      workoutsRepo.logSet(workoutExerciseId, { reps, weight, completed: true })
    );
    if (setId === undefined) {
      get().load();
      return [];
    }

    const exerciseId = get().exerciseIdFor(workoutExerciseId);
    let prs: DetectedPR[] = [];

    if (exerciseId && weight != null && reps != null) {
      const bests = safe(() => progressRepo.bestByMetric(exerciseId)) ?? {};
      prs = detectPRs({ weightKg: weight, reps }, bests);

      if (prs.length > 0) {
        safe(() => workoutsRepo.updateSet(setId, { isPr: true }));
        for (const pr of prs) {
          safe(() =>
            progressRepo.recordPR(exerciseId, pr.metric, pr.value, workoutId)
          );
        }
      }
    }

    get().load();
    return prs;
  },

  updateSet: (setId, patch) => {
    safe(() => workoutsRepo.updateSet(setId, patch));
    get().load();
  },

  removeSet: (setId) => {
    safe(() => workoutsRepo.removeSet(setId));
    get().load();
  },

  finish: () => {
    const workoutId = get().active?.workout.id;
    if (workoutId === undefined) return null;
    safe(() => workoutsRepo.finish(workoutId));
    set({ active: null });
    return workoutId;
  },

  cancel: () => {
    const workoutId = get().active?.workout.id;
    if (workoutId === undefined) return;
    safe(() => workoutsRepo.cancel(workoutId));
    set({ active: null });
  },

  exerciseIdFor: (workoutExerciseId) =>
    get().active?.exercises.find((ex) => ex.id === workoutExerciseId)?.exerciseId,
}));

export default useSessionStore;
