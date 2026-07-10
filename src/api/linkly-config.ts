/** @deprecated Prefer EXPO_PUBLIC_NUDGEKIT_BUILDER_ID for journey resolve. */
export const LINKLY_BUILD_ID = Number(process.env.EXPO_PUBLIC_LINKLY_BUILD_ID ?? 1);

export const NUDGEKIT_API_KEY = "lk_live_42d1aca286fd4636b9c43b476d6f6c90";

/** Journey owner — copy from admin Builder ID badge. */
export const NUDGEKIT_BUILDER_ID = 3;

export const NUDGEKIT_USER_ID =
  process.env.EXPO_PUBLIC_NUDGEKIT_USER_ID ?? "demo-user";

export const NUDGEKIT_BASE_URL =
  process.env.EXPO_PUBLIC_NUDGEKIT_BASE_URL ?? undefined;
