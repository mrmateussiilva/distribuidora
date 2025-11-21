import { invoke } from "@tauri-apps/api/core";
import type { StockMovementWithProduct } from "../types";

export const stockApi = {
  stockIn: async (productId: number, quantity: number): Promise<void> => {
    return await invoke("stock_in", { productId, quantity });
  },

  stockOut: async (productId: number, quantity: number): Promise<void> => {
    return await invoke("stock_out", { productId, quantity });
  },

  stockAdjust: async (productId: number, quantity: number): Promise<void> => {
    return await invoke("stock_adjust", { productId, quantity });
  },

  getMovements: async (): Promise<StockMovementWithProduct[]> => {
    return await invoke("get_stock_movements");
  },
};

