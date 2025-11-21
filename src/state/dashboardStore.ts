import { create } from "zustand";
import type { DashboardStats } from "../types";
import { dashboardApi } from "../api/dashboard";

interface DashboardState {
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  fetchStats: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  stats: null,
  loading: false,
  error: null,

  fetchStats: async () => {
    set({ loading: true, error: null });
    try {
      const stats = await dashboardApi.getStats();
      set({ stats, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Erro ao carregar estatísticas",
        loading: false,
      });
    }
  },
}));

