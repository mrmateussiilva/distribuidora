import { invoke } from "@tauri-apps/api/core";
import type {
  CreateOrderPayload,
  UpdateOrderPayload,
  OrderWithCustomer,
  OrderWithItems,
} from "../types";

export const ordersApi = {
  create: async (payload: CreateOrderPayload): Promise<number> => {
    return await invoke("create_order", { payload });
  },

  getAll: async (): Promise<OrderWithCustomer[]> => {
    return await invoke("get_orders");
  },

  getById: async (id: number): Promise<OrderWithItems> => {
    return await invoke("get_order", { id });
  },

  getByCustomer: async (customerId: number): Promise<OrderWithCustomer[]> => {
    return await invoke("get_orders_by_customer", { customerId });
  },

  update: async (id: number, payload: UpdateOrderPayload): Promise<void> => {
    return await invoke("update_order", { id, payload });
  },

  delete: async (id: number): Promise<void> => {
    return await invoke("delete_order", { id });
  },
};

