import { eq, sql } from 'drizzle-orm';

import * as api from '@/api/exercisedb';
import { EXERCISEDB_PAGE_SIZE } from '@/api/config';
import { db } from '@/db/client';
import {
  exercises,
  facets,
  syncMeta,
  type NewExercise,
  type NewFacet,
  type SyncMeta,
} from '@/db/schema';

const SYNC_META_ID = 1;

const UPSERT_BATCH_SIZE = 100;

export interface SyncProgress {
  current: number;
  total: number;
}

export interface SyncOptions {
  onProgress?: (progress: SyncProgress) => void;
}

function ensureSyncMeta(): SyncMeta {
  const existing = db
    .select()
    .from(syncMeta)
    .where(eq(syncMeta.id, SYNC_META_ID))
    .get();
  if (existing) return existing;

  const row = {
    id: SYNC_META_ID,
    status: 'idle' as const,
    catalogCount: 0,
    lastOffset: 0,
    catalogSyncedAt: null,
  };
  db.insert(syncMeta).values(row).run();
  return row as SyncMeta;
}

function patchSyncMeta(patch: Partial<SyncMeta>): void {
  db.update(syncMeta).set(patch).where(eq(syncMeta.id, SYNC_META_ID)).run();
}

export function getSyncStatus(): SyncMeta {
  return ensureSyncMeta();
}

export function isSynced(): boolean {
  return ensureSyncMeta().status === 'complete';
}

function upsertExercises(rows: NewExercise[]): void {
  if (rows.length === 0) return;

  db.transaction((tx) => {
    for (let i = 0; i < rows.length; i += UPSERT_BATCH_SIZE) {
      const chunk = rows.slice(i, i + UPSERT_BATCH_SIZE);
      tx.insert(exercises)
        .values(chunk)
        .onConflictDoUpdate({
          target: exercises.id,
          set: {
            name: sql`excluded.name`,
            gifUrl: sql`excluded.gif_url`,
            bodyParts: sql`excluded.body_parts`,
            equipments: sql`excluded.equipments`,
            targetMuscles: sql`excluded.target_muscles`,
            secondaryMuscles: sql`excluded.secondary_muscles`,
            instructions: sql`excluded.instructions`,
          },
        })
        .run();
    }
  });
}

async function syncFacets(): Promise<void> {
  const [bp, eq_, mus] = await Promise.all([
    api.bodyParts(),
    api.equipments(),
    api.muscles(),
  ]);

  const rows: NewFacet[] = [
    ...bp.map((value) => ({ type: 'bodyPart' as const, value })),
    ...eq_.map((value) => ({ type: 'equipment' as const, value })),
    ...mus.map((value) => ({ type: 'muscle' as const, value })),
  ];

  db.transaction((tx) => {
    tx.delete(facets).run();
    if (rows.length > 0) {
      for (let i = 0; i < rows.length; i += UPSERT_BATCH_SIZE) {
        tx.insert(facets)
          .values(rows.slice(i, i + UPSERT_BATCH_SIZE))
          .run();
      }
    }
  });
}

export async function syncCatalog(options: SyncOptions = {}): Promise<void> {
  const { onProgress } = options;
  const meta = ensureSyncMeta();

  let offset = meta.lastOffset ?? 0;
  let total = meta.catalogCount ?? 0;

  patchSyncMeta({ status: 'in_progress' });

  const seen = new Set<string>();

  try {
    while (true) {
      const page = await api.listExercises({
        offset,
        limit: EXERCISEDB_PAGE_SIZE,
      });

      if (page.total && page.total > 0) {
        total = page.total;
      }

      const fresh = page.exercises.filter((e) => !seen.has(e.id));
      for (const e of page.exercises) seen.add(e.id);

      if (fresh.length > 0) {
        upsertExercises(fresh);
      }

      offset += page.exercises.length;

      patchSyncMeta({ lastOffset: offset, catalogCount: seen.size });

      onProgress?.({ current: seen.size, total: Math.max(total, seen.size) });

      if (
        page.exercises.length === 0 ||
        fresh.length === 0 ||
        !page.hasMore
      ) {
        break;
      }
    }

    await syncFacets();

    patchSyncMeta({
      status: 'complete',
      catalogSyncedAt: Date.now(),
      catalogCount: seen.size,
    });
  } catch (err) {
    patchSyncMeta({ status: 'error' });
    throw err;
  }
}

export async function refreshCatalog(options: SyncOptions = {}): Promise<void> {
  ensureSyncMeta();
  patchSyncMeta({ status: 'in_progress', lastOffset: 0 });
  await syncCatalog(options);
}
