import { invoke } from "@tauri-apps/api/core";
import type {
  Customer,
  CreateCustomerPayload,
  UpdateCustomerPayload,
} from "../types";

export const customersApi = {
  getAll: async (): Promise<Customer[]> => {
    return await invoke("get_customers");
  },

  getById: async (id: number): Promise<Customer> => {
    return await invoke("get_customer", { id });
  },

  searchByPhone: async (phone: string): Promise<Customer[]> => {
    return await invoke("search_customers_by_phone", { phone });
  },

  create: async (payload: CreateCustomerPayload): Promise<number> => {
    return await invoke("create_customer", { payload });
  },

  update: async (
    id: number,
    payload: UpdateCustomerPayload
  ): Promise<void> => {
    return await invoke("update_customer", { id, payload });
  },

  delete: async (id: number): Promise<void> => {
    return await invoke("delete_customer", { id });
  },
};

