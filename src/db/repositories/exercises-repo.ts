import { and, asc, eq, like, or, sql, type SQL } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";

import { db } from "@/db/client";
import { exercises, facets, type Exercise } from "@/db/schema";

export interface ExerciseListOptions {
  search?: string;
  bodyParts?: string[];
  equipments?: string[];
  targetMuscles?: string[];
  limit?: number;
  offset?: number;
}

function jsonArrayContains(column: SQLiteColumn, value: string): SQL {
  return sql`${column} LIKE ${"%" + JSON.stringify(value) + "%"}`;
}

function facetCondition(
  column: SQLiteColumn,
  values: string[] | undefined
): SQL | undefined {
  if (!values || values.length === 0) return undefined;
  const parts = values.map((v) => jsonArrayContains(column, v));
  return parts.length === 1 ? parts[0] : or(...parts);
}

function buildConditions(opts: ExerciseListOptions = {}): SQL[] {
  const conditions: SQL[] = [];

  if (opts.search && opts.search.trim().length > 0) {
    conditions.push(like(exercises.name, `%${opts.search.trim()}%`));
  }

  const bodyParts = facetCondition(exercises.bodyParts, opts.bodyParts);
  if (bodyParts) conditions.push(bodyParts);

  const equipments = facetCondition(exercises.equipments, opts.equipments);
  if (equipments) conditions.push(equipments);

  const targetMuscles = facetCondition(
    exercises.targetMuscles,
    opts.targetMuscles
  );
  if (targetMuscles) conditions.push(targetMuscles);

  return conditions;
}

export const exercisesRepo = {
  list(opts: ExerciseListOptions = {}): Exercise[] {
    const conditions = buildConditions(opts);
    let query = db.select().from(exercises).$dynamic();

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    query = query.orderBy(asc(exercises.name));

    if (opts.limit !== undefined) query = query.limit(opts.limit);
    if (opts.offset !== undefined) query = query.offset(opts.offset);

    return query.all();
  },

  search(q: string, opts: Omit<ExerciseListOptions, "search"> = {}): Exercise[] {
    return this.list({ ...opts, search: q });
  },

  getById(id: string): Exercise | undefined {
    return db.select().from(exercises).where(eq(exercises.id, id)).get();
  },

  count(opts: ExerciseListOptions = {}): number {
    const conditions = buildConditions(opts);
    let query = db
      .select({ value: sql<number>`count(*)` })
      .from(exercises)
      .$dynamic();
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    const row = query.get();
    return row?.value ?? 0;
  },

  facets(): { bodyParts: string[]; equipments: string[]; muscles: string[] } {
    const rows = db
      .select({ type: facets.type, value: facets.value })
      .from(facets)
      .orderBy(asc(facets.type), asc(facets.value))
      .all();

    const result = {
      bodyParts: [] as string[],
      equipments: [] as string[],
      muscles: [] as string[],
    };
    for (const row of rows) {
      if (row.type === "bodyPart") result.bodyParts.push(row.value);
      else if (row.type === "equipment") result.equipments.push(row.value);
      else if (row.type === "muscle") result.muscles.push(row.value);
    }
    return result;
  },
};
