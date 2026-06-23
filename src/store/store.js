import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useStore = create(
  persist(
    (set) => ({
      activeWorkspaceId: null,
      setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
      
      // We store the parsed trial map (CSV) in Zustand since it's not strictly 'scored' data,
      // but if it gets too large (>5MB), we will need to move this to Dexie. 
      // For now, persist it in localStorage via Zustand.
      trialData: [],
      setTrialData: (data) => set({ trialData: data }),
      
      colMap: { plot: '', geno: '', trial: '', location: '', year: '', row: '', col: '', rep: '', pedigree: '' },
      setColMap: (map) => set({ colMap: map }),

      visibleMetadata: { trial: true, location: true, year: true, row: true, col: true, rep: true, pedigree: true },
      setVisibleMetadata: (metadata) => set({ visibleMetadata: metadata }),

      traits: [], // Array of objects: { name: 'Yield', type: 'decimal', soft_max: 20 }
      setTraits: (traits) => set({ traits: traits }),
      addTrait: (trait) => set((state) => ({ traits: [...state.traits, trait] })),
    }),
    {
      name: 'field-data-storage', // unique name for localStorage key
    }
  )
);
