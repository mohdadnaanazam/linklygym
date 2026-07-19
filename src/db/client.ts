import { useEffect, useState } from "react";
import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";
import { drizzle, type ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";

import * as schema from "@/db/schema";
import migrations from "@/db/migrations/migrations";

export type Database = ExpoSQLiteDatabase<typeof schema>;

/** Populated after `initDatabase()` resolves. Safe to use once StartupGate is ready. */
export let sqlite: SQLiteDatabase;
export let db: Database;

let initPromise: Promise<void> | null = null;

/**
 * Open SQLite asynchronously.
 *
 * On web, `openDatabaseSync` busy-waits while the WASM worker boots and often
 * throws "Sync operation timeout". Async open waits properly for the worker.
 * Native still uses the same async path (works everywhere).
 */
export function initDatabase(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      sqlite = await openDatabaseAsync("linklygym.db", {
        enableChangeListener: false,
      });
      await sqlite.execAsync("PRAGMA foreign_keys = ON;");
      db = drizzle(sqlite, { schema });
    })().catch((err) => {
      // Allow a later retry from StartupGate after a failed first attempt.
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

export function useRunMigrations(): { success: boolean; error?: Error } {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<Error | undefined>();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await initDatabase();
        await migrate(db, migrations);
        if (!cancelled) {
          setError(undefined);
          setSuccess(true);
        }
      } catch (e) {
        if (!cancelled) {
          setSuccess(false);
          setError(e instanceof Error ? e : new Error(String(e)));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { success, error };
}

export { schema };
