import { invoke } from "@tauri-apps/api/core";
import type {
  CreateOrderPayload,
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
};

