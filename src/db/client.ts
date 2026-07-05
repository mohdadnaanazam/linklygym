import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";

import * as schema from "@/db/schema";
import migrations from "@/db/migrations/migrations";

export const sqlite: SQLiteDatabase = openDatabaseSync("linklygym.db", {
  enableChangeListener: false,
});

sqlite.execSync("PRAGMA foreign_keys = ON;");

export const db = drizzle(sqlite, { schema });

export { schema };

export type Database = typeof db;

export function useRunMigrations(): { success: boolean; error?: Error } {
  return useMigrations(db, migrations);
}
