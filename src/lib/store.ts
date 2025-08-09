import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface HistoryItem { id: string; svg: string; name: string; sector: string; createdAt: number; palette: string[]; font: string; }
interface UIState {
  history: HistoryItem[];
  add(item: Omit<HistoryItem, 'id'|'createdAt'>): void;
  palette: string[];
  font: string;
  setPalette(p: string[]): void;
  setFont(f: string): void;
}

export const useLogoStore = create<UIState>()(persist((set) => ({
  history: [],
  palette: ['#FF7A18','#AF002D','#319197'],
  font: 'Inter',
  add: (item) => set(s=> ({ history: [{ id: crypto.randomUUID(), createdAt: Date.now(), ...item}, ...s.history].slice(0,50) })),
  setPalette: (p) => set({ palette: p }),
  setFont: (f) => set({ font: f })
}), { name: 'logo-maker-store' }));
