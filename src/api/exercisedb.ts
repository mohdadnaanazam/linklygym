import {
  EXERCISEDB_BASE_URL,
  EXERCISEDB_MAX_RETRIES,
  EXERCISEDB_PAGE_SIZE,
} from '@/api/config';
import type { NewExercise } from '@/db/schema';

export interface ApiExercise {
  exerciseId: string;
  name: string;
  gifUrl?: string | null;
  bodyParts?: string[];
  equipments?: string[];
  targetMuscles?: string[];
  secondaryMuscles?: string[];
  instructions?: string[];
}

interface ApiMeta {
  total?: number;
  totalExercises?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  nextCursor?: string | null;
  nextPage?: string | null;
  totalPages?: number;
  currentPage?: number;
}

interface Envelope<T> {
  success?: boolean;
  data?: T;
  meta?: ApiMeta;
  metadata?: ApiMeta;
}

type FacetRow = { name: string } | string;

export interface ExercisePage {
  exercises: NewExercise[];
  total?: number;
  hasMore: boolean;
}

export class ExerciseDbError extends Error {
  readonly status: number;
  readonly url: string;

  constructor(status: number, url: string, message?: string) {
    super(message ?? `ExerciseDB request failed with status ${status}`);
    this.name = 'ExerciseDbError';
    this.status = status;
    this.url = url;
  }
}

async function request<T>(path: string): Promise<T> {
  const url = `${EXERCISEDB_BASE_URL}${path}`;

  let lastError: unknown;
  for (let attempt = 0; attempt < EXERCISEDB_MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        let detail = '';
        try {
          detail = await res.text();
        } catch {
        }
        throw new ExerciseDbError(res.status, url, detail || undefined);
      }

      return (await res.json()) as T;
    } catch (err) {
      lastError = err;
      if (err instanceof ExerciseDbError) throw err;
      if (attempt === EXERCISEDB_MAX_RETRIES - 1) break;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`ExerciseDB request to ${url} failed`);
}

function unwrap<T>(body: Envelope<T> | T): T | undefined {
  if (body && typeof body === 'object' && 'data' in (body as Envelope<T>)) {
    return (body as Envelope<T>).data;
  }
  return body as T;
}

function metaOf(body: unknown): ApiMeta | undefined {
  if (body && typeof body === 'object') {
    const env = body as Envelope<unknown>;
    return env.meta ?? env.metadata;
  }
  return undefined;
}

function mapExercise(api: ApiExercise): NewExercise {
  return {
    id: api.exerciseId,
    name: api.name,
    gifUrl: api.gifUrl ?? null,
    bodyParts: api.bodyParts ?? [],
    equipments: api.equipments ?? [],
    targetMuscles: api.targetMuscles ?? [],
    secondaryMuscles: api.secondaryMuscles ?? [],
    instructions: api.instructions ?? [],
  };
}

function mapFacet(row: FacetRow): string {
  return typeof row === 'string' ? row : row.name;
}

function computeHasMore(
  meta: ApiMeta | undefined,
  received: number,
  offset: number,
  limit: number
): boolean {
  if (meta) {
    if (typeof meta.hasNextPage === 'boolean') return meta.hasNextPage;
    if ('nextPage' in meta) return meta.nextPage != null;
  }
  const total = meta?.total ?? meta?.totalExercises;
  if (typeof total === 'number') return offset + received < total;
  return received === limit;
}

export async function listExercises(params: {
  offset: number;
  limit?: number;
}): Promise<ExercisePage> {
  const limit = params.limit ?? EXERCISEDB_PAGE_SIZE;
  const offset = Math.max(0, params.offset);
  const body = await request<Envelope<ApiExercise[]>>(
    `/exercises?offset=${offset}&limit=${limit}`
  );
  const data = unwrap<ApiExercise[]>(body) ?? [];
  const meta = metaOf(body);

  return {
    exercises: data.map(mapExercise),
    total: meta?.total ?? meta?.totalExercises,
    hasMore: computeHasMore(meta, data.length, offset, limit),
  };
}

export async function getExercise(id: string): Promise<NewExercise> {
  const body = await request<Envelope<ApiExercise>>(
    `/exercises/${encodeURIComponent(id)}`
  );
  const data = unwrap<ApiExercise>(body);
  if (!data) {
    throw new Error(`ExerciseDB returned no exercise for id "${id}"`);
  }
  return mapExercise(data);
}

export async function bodyParts(): Promise<string[]> {
  const body = await request<Envelope<FacetRow[]>>(`/bodyparts`);
  return (unwrap<FacetRow[]>(body) ?? []).map(mapFacet);
}

export async function equipments(): Promise<string[]> {
  const body = await request<Envelope<FacetRow[]>>(`/equipments`);
  return (unwrap<FacetRow[]>(body) ?? []).map(mapFacet);
}

export async function muscles(): Promise<string[]> {
  const body = await request<Envelope<FacetRow[]>>(`/muscles`);
  return (unwrap<FacetRow[]>(body) ?? []).map(mapFacet);
}

export async function search(
  query: string,
  limit = EXERCISEDB_PAGE_SIZE
): Promise<NewExercise[]> {
  const term = query.trim();
  if (!term) return [];
  const encoded = encodeURIComponent(term);
  const body = await request<Envelope<ApiExercise[]>>(
    `/exercises/search?search=${encoded}&q=${encoded}&limit=${limit}`
  );
  return (unwrap<ApiExercise[]>(body) ?? []).map(mapExercise);
}
