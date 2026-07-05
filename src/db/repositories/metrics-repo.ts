import { and, asc, eq, gte, lte } from "drizzle-orm";

import { db } from "@/db/client";
import { bodyMetrics, type BodyMetric } from "@/db/schema";

export interface DateRange {
  start?: number;
  end?: number;
}

export const metricsRepo = {
  add(entry: { type: string; value: number; unit: string }): number {
    const inserted = db
      .insert(bodyMetrics)
      .values({
        type: entry.type,
        value: entry.value,
        unit: entry.unit,
        recordedAt: Date.now(),
      })
      .returning({ id: bodyMetrics.id })
      .get();
    return inserted.id;
  },

  listByType(type: string, range?: DateRange): BodyMetric[] {
    const conditions = [eq(bodyMetrics.type, type)];
    if (range?.start !== undefined) {
      conditions.push(gte(bodyMetrics.recordedAt, range.start));
    }
    if (range?.end !== undefined) {
      conditions.push(lte(bodyMetrics.recordedAt, range.end));
    }
    return db
      .select()
      .from(bodyMetrics)
      .where(and(...conditions))
      .orderBy(asc(bodyMetrics.recordedAt))
      .all();
  },

  types(): string[] {
    return db
      .selectDistinct({ type: bodyMetrics.type })
      .from(bodyMetrics)
      .orderBy(asc(bodyMetrics.type))
      .all()
      .map((row) => row.type);
  },

  deleteById(id: number): void {
    db.delete(bodyMetrics).where(eq(bodyMetrics.id, id)).run();
  },
};
