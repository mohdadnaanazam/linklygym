import { db } from "@/db/client";
import {
  bodyMetrics,
  favorites,
  personalRecords,
  routineExercises,
  routines,
  workoutExercises,
  workoutSets,
  workouts,
} from "@/db/schema";

export function clearUserData(): void {
  db.transaction((tx) => {
    tx.delete(workoutSets).run();
    tx.delete(workoutExercises).run();
    tx.delete(personalRecords).run();
    tx.delete(workouts).run();

    tx.delete(routineExercises).run();
    tx.delete(routines).run();

    tx.delete(favorites).run();
    tx.delete(bodyMetrics).run();
  });
}
