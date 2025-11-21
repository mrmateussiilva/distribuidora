import { create } from "zustand";
import type { CartItem, Product } from "../types";

interface CartState {
  items: CartItem[];
  addItem: (product: Product, quantity?: number, returnedBottle?: boolean) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  updateCustomPrice: (productId: number, price: number | undefined) => void;
  toggleReturnedBottle: (productId: number) => void;
  clear: () => void;
  getItemPrice: (item: CartItem) => number;
  getTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (product, quantity = 1, returnedBottle = false) => {
    const existingItem = get().items.find(
      (item) => item.product.id === product.id
    );

    if (existingItem) {
      // Se já existe, apenas incrementa a quantidade
      get().updateQuantity(product.id, existingItem.quantity + quantity);
    } else {
      // Adiciona novo item com os parâmetros especificados
      set((state) => ({
        items: [
          ...state.items,
          {
            product,
            quantity,
            returnedBottle,
          },
        ],
      }));
    }
  },

  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter((item) => item.product.id !== productId),
    }));
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }

    set((state) => ({
      items: state.items.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      ),
    }));
  },

  updateCustomPrice: (productId, price) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.product.id === productId
          ? { ...item, customPrice: price }
          : item
      ),
    }));
  },

  toggleReturnedBottle: (productId) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.product.id === productId
          ? { ...item, returnedBottle: !item.returnedBottle }
          : item
      ),
    }));
  },

  clear: () => {
    set({ items: [] });
  },

  getItemPrice: (item) => {
    // Se houver preço customizado, usa ele
    if (item.customPrice !== undefined) {
      return item.customPrice;
    }
    // Caso contrário, usa o preço baseado no casco
    return item.returnedBottle ? item.product.price_refill : item.product.price_full;
  },

  getTotal: () => {
    return get().items.reduce((total, item) => {
      return total + get().getItemPrice(item) * item.quantity;
    }, 0);
  },
}));

