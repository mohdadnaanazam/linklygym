import { create } from "zustand";

interface TimerState {
  endsAt: number | null;
  durationSec: number;
  running: boolean;

  start: (seconds: number) => void;
  addTime: (deltaSec: number) => void;
  skip: () => void;
  stop: () => void;
  remainingMs: (now?: number) => number;
}

export const useTimerStore = create<TimerState>((set, get) => ({
  endsAt: null,
  durationSec: 0,
  running: false,

  start: (seconds) => {
    const clamped = Math.max(0, Math.round(seconds));
    set({
      endsAt: Date.now() + clamped * 1000,
      durationSec: clamped,
      running: true,
    });
  },

  addTime: (deltaSec) => {
    const { endsAt, durationSec, running } = get();
    if (endsAt === null || !running) return;
    const now = Date.now();
    const nextEndsAt = Math.max(now, endsAt + deltaSec * 1000);
    const nextDuration = Math.max(0, durationSec + deltaSec);
    set({ endsAt: nextEndsAt, durationSec: nextDuration });
  },

  skip: () => set({ endsAt: null, durationSec: 0, running: false }),

  stop: () => set({ endsAt: null, durationSec: 0, running: false }),

  remainingMs: (now = Date.now()) => {
    const { endsAt } = get();
    return endsAt ? Math.max(0, endsAt - now) : 0;
  },
}));

export default useTimerStore;
