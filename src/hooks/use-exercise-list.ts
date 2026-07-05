import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { exercisesRepo } from '@/db/repositories';
import type { ExerciseListOptions } from '@/db/repositories/exercises-repo';
import type { Exercise } from '@/db/schema';

export interface ExerciseFilters {
  bodyParts: string[];
  equipments: string[];
  targetMuscles: string[];
}

export type ExerciseFacet = keyof ExerciseFilters;

export const EMPTY_FILTERS: ExerciseFilters = {
  bodyParts: [],
  equipments: [],
  targetMuscles: [],
};

const PAGE_SIZE = 30;
const SEARCH_DEBOUNCE_MS = 250;

export interface UseExerciseListResult {
  query: string;
  setQuery: (value: string) => void;
  filters: ExerciseFilters;
  toggleFilter: (facet: ExerciseFacet, value: string) => void;
  clearFilters: () => void;
  activeFilterCount: number;
  hasActiveQuery: boolean;
  results: Exercise[];
  total: number;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
  catalogEmpty: boolean;
}

export function useExerciseList(): UseExerciseListResult {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filters, setFilters] = useState<ExerciseFilters>(EMPTY_FILTERS);

  const [results, setResults] = useState<Exercise[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [catalogEmpty, setCatalogEmpty] = useState(false);

  const offsetRef = useRef(0);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query]);

  const activeFilterCount =
    filters.bodyParts.length + filters.equipments.length + filters.targetMuscles.length;

  const hasActiveQuery = activeFilterCount > 0 || debouncedQuery.trim().length > 0;

  const baseOpts = useMemo<Omit<ExerciseListOptions, 'limit' | 'offset'>>(
    () => ({
      search: debouncedQuery.trim() || undefined,
      bodyParts: filters.bodyParts.length ? filters.bodyParts : undefined,
      equipments: filters.equipments.length ? filters.equipments : undefined,
      targetMuscles: filters.targetMuscles.length ? filters.targetMuscles : undefined,
    }),
    [debouncedQuery, filters]
  );

  const hasMore = results.length < total;

  const reload = useCallback(() => {
    setLoading(true);
    try {
      const totalCount = exercisesRepo.count(baseOpts);
      const page = exercisesRepo.list({ ...baseOpts, limit: PAGE_SIZE, offset: 0 });
      setTotal(totalCount);
      setResults(page);
      offsetRef.current = page.length;

      if (totalCount === 0 && !hasActiveQuery) {
        setCatalogEmpty(exercisesRepo.count() === 0);
      } else {
        setCatalogEmpty(false);
      }
    } finally {
      setLoading(false);
    }
  }, [baseOpts, hasActiveQuery]);

  useEffect(() => {
    reload();
  }, [reload]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore) return;
    if (offsetRef.current >= total) return;

    setLoadingMore(true);
    try {
      const page = exercisesRepo.list({
        ...baseOpts,
        limit: PAGE_SIZE,
        offset: offsetRef.current,
      });
      if (page.length > 0) {
        offsetRef.current += page.length;
        setResults((prev) => [...prev, ...page]);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [baseOpts, loading, loadingMore, total]);

  const toggleFilter = useCallback((facet: ExerciseFacet, value: string) => {
    setFilters((prev) => {
      const current = prev[facet];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [facet]: next };
    });
  }, []);

  const clearFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);

  return {
    query,
    setQuery,
    filters,
    toggleFilter,
    clearFilters,
    activeFilterCount,
    hasActiveQuery,
    results,
    total,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    refresh: reload,
    catalogEmpty,
  };
}

export default useExerciseList;
