import { create } from 'zustand';

type InspectorSession = {
  sessionId: string;
  relayOrigin: string;
};

type InspectorState = {
  session: InspectorSession | null;
  activate: (session: InspectorSession) => void;
  deactivate: () => void;
};

export const useInspectorStore = create<InspectorState>((set) => ({
  session: null,
  activate: (session) => set({ session }),
  deactivate: () => set({ session: null }),
}));
