import { invoke } from "@tauri-apps/api/core";
import type {
  Product,
  CreateProductPayload,
  UpdateProductPayload,
} from "../types";

export const productsApi = {
  getAll: async (): Promise<Product[]> => {
    return await invoke("get_products");
  },

  getById: async (id: number): Promise<Product> => {
    return await invoke("get_product", { id });
  },

  create: async (payload: CreateProductPayload): Promise<number> => {
    return await invoke("create_product", { payload });
  },

  update: async (
    id: number,
    payload: UpdateProductPayload
  ): Promise<void> => {
    return await invoke("update_product", { id, payload });
  },

  delete: async (id: number): Promise<void> => {
    return await invoke("delete_product", { id });
  },
};

