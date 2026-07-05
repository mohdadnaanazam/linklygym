import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { settings, type Settings } from "@/db/schema";

const SETTINGS_ID = 1;

const DEFAULTS = {
  id: SETTINGS_ID,
  weightUnit: "kg" as const,
  defaultRestSec: 90,
  theme: "dark",
};

export const settingsRepo = {
  get(): Settings {
    const existing = db
      .select()
      .from(settings)
      .where(eq(settings.id, SETTINGS_ID))
      .get();
    if (existing) return existing;

    db.insert(settings).values(DEFAULTS).run();
    return { ...DEFAULTS } as Settings;
  },

  update(
    patch: Partial<Pick<Settings, "weightUnit" | "defaultRestSec" | "theme">>
  ): Settings {
    this.get();
    db.update(settings).set(patch).where(eq(settings.id, SETTINGS_ID)).run();
    return db
      .select()
      .from(settings)
      .where(eq(settings.id, SETTINGS_ID))
      .get() as Settings;
  },
};
