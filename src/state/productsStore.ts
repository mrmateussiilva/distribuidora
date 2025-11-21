import { create } from "zustand";
import type { Product } from "../types";
import { productsApi } from "../api/products";

interface ProductsState {
  products: Product[];
  loading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  addProduct: (product: Product) => void;
  updateProduct: (id: number, product: Product) => void;
  removeProduct: (id: number) => void;
}

export const useProductsStore = create<ProductsState>((set) => ({
  products: [],
  loading: false,
  error: null,

  fetchProducts: async () => {
    set({ loading: true, error: null });
    try {
      const products = await productsApi.getAll();
      set({ products, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Erro ao carregar produtos",
        loading: false,
      });
    }
  },

  addProduct: (product) => {
    set((state) => ({
      products: [...state.products, product],
    }));
  },

  updateProduct: (id, product) => {
    set((state) => ({
      products: state.products.map((p) => (p.id === id ? product : p)),
    }));
  },

  removeProduct: (id) => {
    set((state) => ({
      products: state.products.filter((p) => p.id !== id),
    }));
  },
}));

