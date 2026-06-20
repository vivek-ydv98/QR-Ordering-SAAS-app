import { create } from 'zustand';

interface UIState {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeCategory: string | null;
  setActiveCategory: (categoryId: string | null) => void;
  filterVeg: boolean | null; // null = all, true = veg, false = non-veg
  setFilterVeg: (filter: boolean | null) => void;
  isCartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  isCustomizerOpen: boolean;
  setCustomizerOpen: (open: boolean) => void;
  isWaiterCallOpen: boolean;
  setWaiterCallOpen: (open: boolean) => void;
  activeLanguage: 'en' | 'hi' | 'ta' | 'te' | 'kn' | 'bn';
  setActiveLanguage: (lang: 'en' | 'hi' | 'ta' | 'te' | 'kn' | 'bn') => void;
}

export const useUIStore = create<UIState>((set) => ({
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  activeCategory: null,
  setActiveCategory: (categoryId) => set({ activeCategory: categoryId }),
  filterVeg: null,
  setFilterVeg: (filter) => set({ filterVeg: filter }),
  isCartOpen: false,
  setCartOpen: (open) => set({ isCartOpen: open }),
  isCustomizerOpen: false,
  setCustomizerOpen: (open) => set({ isCustomizerOpen: open }),
  isWaiterCallOpen: false,
  setWaiterCallOpen: (open) => set({ isWaiterCallOpen: open }),
  activeLanguage: 'en',
  setActiveLanguage: (lang) => set({ activeLanguage: lang }),
}));
