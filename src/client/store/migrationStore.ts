import { create } from 'zustand';

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 'summary';

interface MigrationState {
  step: WizardStep;
  setStep: (step: WizardStep) => void;
  selectedObjects: string[];
  toggleObject: (name: string) => void;
}

/** Single source of truth for the 10-step wizard. */
export const useMigrationStore = create<MigrationState>((set) => ({
  step: 1,
  setStep: (step) => set({ step }),
  selectedObjects: [],
  toggleObject: (name) =>
    set((state) => ({
      selectedObjects: state.selectedObjects.includes(name)
        ? state.selectedObjects.filter((o) => o !== name)
        : [...state.selectedObjects, name],
    })),
}));
