const DEFAULT_BASE_URL = 'https://oss.exercisedb.dev/api/v1';

export const EXERCISEDB_BASE_URL = (
  process.env.EXPO_PUBLIC_EXERCISEDB_BASE_URL ?? DEFAULT_BASE_URL
).replace(/\/$/, '');

export const EXERCISEDB_PAGE_SIZE = 25;

export const EXERCISEDB_MAX_RETRIES = 2;
