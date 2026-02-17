import { create } from 'zustand';

export type CarouselSelection =
  | { type: 'all' }
  | { type: 'account'; accountId: string }
  | { type: 'savings'; goalId: string };

interface CarouselSelectionStore {
  selection: CarouselSelection;
  setSelection: (selection: CarouselSelection) => void;
}

export const useCarouselSelectionStore = create<CarouselSelectionStore>((set) => ({
  selection: { type: 'all' },
  setSelection: (selection) => set({ selection }),
}));
