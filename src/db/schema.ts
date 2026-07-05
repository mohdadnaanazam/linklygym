import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const exercises = sqliteTable("exercises", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  gifUrl: text("gif_url"),
  cachedMediaPath: text("cached_media_path"),
  bodyParts: text("body_parts", { mode: "json" }).$type<string[]>(),
  equipments: text("equipments", { mode: "json" }).$type<string[]>(),
  targetMuscles: text("target_muscles", { mode: "json" }).$type<string[]>(),
  secondaryMuscles: text("secondary_muscles", { mode: "json" }).$type<string[]>(),
  instructions: text("instructions", { mode: "json" }).$type<string[]>(),
});

export const facets = sqliteTable("facets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").$type<"bodyPart" | "equipment" | "muscle">().notNull(),
  value: text("value").notNull(),
});

export const syncMeta = sqliteTable("sync_meta", {
  id: integer("id").primaryKey(),
  catalogSyncedAt: integer("catalog_synced_at"),
  catalogCount: integer("catalog_count").default(0),
  status: text("status")
    .$type<"idle" | "in_progress" | "complete" | "error">()
    .notNull()
    .default("idle"),
  lastOffset: integer("last_offset").default(0),
});

export const favorites = sqliteTable("favorites", {
  exerciseId: text("exercise_id")
    .primaryKey()
    .references(() => exercises.id),
  createdAt: integer("created_at").notNull(),
});

export const routines = sqliteTable("routines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  note: text("note"),
  sortOrder: integer("sort_order").default(0),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const routineExercises = sqliteTable("routine_exercises", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  routineId: integer("routine_id")
    .notNull()
    .references(() => routines.id, { onDelete: "cascade" }),
  exerciseId: text("exercise_id")
    .notNull()
    .references(() => exercises.id),
  position: integer("position").notNull(),
  targetSets: integer("target_sets"),
  targetReps: integer("target_reps"),
  targetWeight: real("target_weight"),
  restSeconds: integer("rest_seconds"),
});

export const workouts = sqliteTable("workouts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  routineId: integer("routine_id").references(() => routines.id),
  startedAt: integer("started_at").notNull(),
  endedAt: integer("ended_at"),
  durationSec: integer("duration_sec"),
  totalVolume: real("total_volume").default(0),
  status: text("status")
    .$type<"in_progress" | "completed">()
    .notNull()
    .default("in_progress"),
});

export const workoutExercises = sqliteTable("workout_exercises", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workoutId: integer("workout_id")
    .notNull()
    .references(() => workouts.id, { onDelete: "cascade" }),
  exerciseId: text("exercise_id")
    .notNull()
    .references(() => exercises.id),
  position: integer("position").notNull(),
});

export const workoutSets = sqliteTable("workout_sets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workoutExerciseId: integer("workout_exercise_id")
    .notNull()
    .references(() => workoutExercises.id, { onDelete: "cascade" }),
  setNumber: integer("set_number").notNull(),
  reps: integer("reps"),
  weight: real("weight"),
  completed: integer("completed", { mode: "boolean" }).default(false),
  isPr: integer("is_pr", { mode: "boolean" }).default(false),
  createdAt: integer("created_at").notNull(),
});

export const personalRecords = sqliteTable("personal_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  exerciseId: text("exercise_id")
    .notNull()
    .references(() => exercises.id),
  metric: text("metric").$type<"max_weight" | "est_1rm" | "max_volume">().notNull(),
  value: real("value").notNull(),
  workoutId: integer("workout_id").references(() => workouts.id),
  achievedAt: integer("achieved_at").notNull(),
});

export const bodyMetrics = sqliteTable("body_metrics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(),
  value: real("value").notNull(),
  unit: text("unit").notNull(),
  recordedAt: integer("recorded_at").notNull(),
});

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(),
  weightUnit: text("weight_unit").$type<"kg" | "lb">().notNull().default("kg"),
  defaultRestSec: integer("default_rest_sec").notNull().default(90),
  theme: text("theme").notNull().default("dark"),
});

export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;

export type Facet = typeof facets.$inferSelect;
export type NewFacet = typeof facets.$inferInsert;

export type SyncMeta = typeof syncMeta.$inferSelect;
export type NewSyncMeta = typeof syncMeta.$inferInsert;

export type Favorite = typeof favorites.$inferSelect;
export type NewFavorite = typeof favorites.$inferInsert;

export type Routine = typeof routines.$inferSelect;
export type NewRoutine = typeof routines.$inferInsert;

export type RoutineExercise = typeof routineExercises.$inferSelect;
export type NewRoutineExercise = typeof routineExercises.$inferInsert;

export type Workout = typeof workouts.$inferSelect;
export type NewWorkout = typeof workouts.$inferInsert;

export type WorkoutExercise = typeof workoutExercises.$inferSelect;
export type NewWorkoutExercise = typeof workoutExercises.$inferInsert;

export type WorkoutSet = typeof workoutSets.$inferSelect;
export type NewWorkoutSet = typeof workoutSets.$inferInsert;

export type PersonalRecord = typeof personalRecords.$inferSelect;
export type NewPersonalRecord = typeof personalRecords.$inferInsert;

export type BodyMetric = typeof bodyMetrics.$inferSelect;
export type NewBodyMetric = typeof bodyMetrics.$inferInsert;

export type Settings = typeof settings.$inferSelect;
export type NewSettings = typeof settings.$inferInsert;
