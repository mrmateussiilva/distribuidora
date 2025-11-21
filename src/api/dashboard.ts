import { invoke } from "@tauri-apps/api/core";
import type { DashboardStats } from "../types";

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    return await invoke("get_dashboard_stats");
  },
};

