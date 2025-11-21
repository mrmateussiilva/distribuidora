import { create } from "zustand";
import type { Customer } from "../types";
import { customersApi } from "../api/customers";

interface CustomersState {
  customers: Customer[];
  loading: boolean;
  error: string | null;
  fetchCustomers: () => Promise<void>;
  addCustomer: (customer: Customer) => void;
  updateCustomer: (id: number, customer: Customer) => void;
  removeCustomer: (id: number) => void;
}

export const useCustomersStore = create<CustomersState>((set) => ({
  customers: [],
  loading: false,
  error: null,

  fetchCustomers: async () => {
    set({ loading: true, error: null });
    try {
      const customers = await customersApi.getAll();
      set({ customers, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Erro ao carregar clientes",
        loading: false,
      });
    }
  },

  addCustomer: (customer) => {
    set((state) => ({
      customers: [...state.customers, customer],
    }));
  },

  updateCustomer: (id, customer) => {
    set((state) => ({
      customers: state.customers.map((c) => (c.id === id ? customer : c)),
    }));
  },

  removeCustomer: (id) => {
    set((state) => ({
      customers: state.customers.filter((c) => c.id !== id),
    }));
  },
}));

