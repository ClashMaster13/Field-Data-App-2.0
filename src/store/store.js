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
      
      colMap: { plot: '', geno: '', trial: '' },
      setColMap: (map) => set({ colMap: map }),

      traits: [], // Array of objects: { name: 'Yield', type: 'decimal', soft_max: 20 }
      setTraits: (traits) => set({ traits: traits }),
      addTrait: (trait) => set((state) => ({ traits: [...state.traits, trait] })),
    }),
    {
      name: 'field-data-storage', // unique name for localStorage key
    }
  )
);
