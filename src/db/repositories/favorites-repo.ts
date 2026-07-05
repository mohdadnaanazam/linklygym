import { desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { exercises, favorites, type Exercise } from "@/db/schema";

export const favoritesRepo = {
  toggle(exerciseId: string): boolean {
    const existing = db
      .select()
      .from(favorites)
      .where(eq(favorites.exerciseId, exerciseId))
      .get();

    if (existing) {
      db.delete(favorites).where(eq(favorites.exerciseId, exerciseId)).run();
      return false;
    }

    db.insert(favorites)
      .values({ exerciseId, createdAt: Date.now() })
      .run();
    return true;
  },

  isFavorite(exerciseId: string): boolean {
    const row = db
      .select()
      .from(favorites)
      .where(eq(favorites.exerciseId, exerciseId))
      .get();
    return row !== undefined;
  },

  listFavorites(): Exercise[] {
    return db
      .select({ exercise: exercises })
      .from(favorites)
      .innerJoin(exercises, eq(favorites.exerciseId, exercises.id))
      .orderBy(desc(favorites.createdAt))
      .all()
      .map((row) => row.exercise);
  },
};
