import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '../cartStore';
import type { Product } from '../../types';

const mockProduct: Product = {
  id: 1,
  name: 'Água 20L',
  description: 'Água mineral',
  type: 'water',
  price_refill: 5.00,
  price_full: 10.00,
  stock_full: 10,
  stock_empty: 0,
};

describe('cartStore', () => {
  beforeEach(() => {
    // Limpa o store antes de cada teste
    useCartStore.getState().clear();
  });

  describe('addItem', () => {
    it('deve adicionar um novo item ao carrinho', () => {
      const { addItem } = useCartStore.getState();
      
      addItem(mockProduct);
      
      const { items } = useCartStore.getState();
      expect(items).toHaveLength(1);
      expect(items[0].product).toEqual(mockProduct);
      expect(items[0].quantity).toBe(1);
      expect(items[0].returnedBottle).toBe(false);
    });

    it('deve adicionar item com quantidade customizada', () => {
      const { addItem } = useCartStore.getState();
      
      addItem(mockProduct, 3);
      
      const { items } = useCartStore.getState();
      expect(items[0].quantity).toBe(3);
    });

    it('deve adicionar item com casco retornado', () => {
      const { addItem } = useCartStore.getState();
      
      addItem(mockProduct, 1, true);
      
      const { items } = useCartStore.getState();
      expect(items[0].returnedBottle).toBe(true);
    });

    it('deve incrementar quantidade se o produto já existir no carrinho', () => {
      const { addItem } = useCartStore.getState();
      
      addItem(mockProduct, 2);
      addItem(mockProduct, 3);
      
      const { items } = useCartStore.getState();
      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(5);
    });
  });

  describe('removeItem', () => {
    it('deve remover um item do carrinho', () => {
      const { addItem, removeItem } = useCartStore.getState();
      
      addItem(mockProduct);
      let { items } = useCartStore.getState();
      expect(items).toHaveLength(1);
      
      removeItem(mockProduct.id);
      
      ({ items } = useCartStore.getState());
      expect(items).toHaveLength(0);
    });

    it('não deve fazer nada se o item não existir', () => {
      const { addItem, removeItem } = useCartStore.getState();
      
      addItem(mockProduct);
      removeItem(999);
      
      const { items } = useCartStore.getState();
      expect(items).toHaveLength(1);
    });
  });

  describe('updateQuantity', () => {
    it('deve atualizar a quantidade de um item', () => {
      const { addItem, updateQuantity } = useCartStore.getState();
      
      addItem(mockProduct);
      updateQuantity(mockProduct.id, 5);
      
      const { items } = useCartStore.getState();
      expect(items[0].quantity).toBe(5);
    });

    it('deve remover o item se a quantidade for 0', () => {
      const { addItem, updateQuantity } = useCartStore.getState();
      
      addItem(mockProduct);
      updateQuantity(mockProduct.id, 0);
      
      const { items } = useCartStore.getState();
      expect(items).toHaveLength(0);
    });

    it('deve remover o item se a quantidade for negativa', () => {
      const { addItem, updateQuantity } = useCartStore.getState();
      
      addItem(mockProduct);
      updateQuantity(mockProduct.id, -1);
      
      const { items } = useCartStore.getState();
      expect(items).toHaveLength(0);
    });
  });

  describe('updateCustomPrice', () => {
    it('deve atualizar o preço customizado de um item', () => {
      const { addItem, updateCustomPrice } = useCartStore.getState();
      
      addItem(mockProduct);
      updateCustomPrice(mockProduct.id, 7.50);
      
      const { items } = useCartStore.getState();
      expect(items[0].customPrice).toBe(7.50);
    });

    it('deve remover o preço customizado se undefined for passado', () => {
      const { addItem, updateCustomPrice } = useCartStore.getState();
      
      addItem(mockProduct);
      updateCustomPrice(mockProduct.id, 7.50);
      updateCustomPrice(mockProduct.id, undefined);
      
      const { items } = useCartStore.getState();
      expect(items[0].customPrice).toBeUndefined();
    });
  });

  describe('toggleReturnedBottle', () => {
    it('deve alternar o estado de casco retornado', () => {
      const { addItem, toggleReturnedBottle } = useCartStore.getState();
      
      addItem(mockProduct);
      let { items } = useCartStore.getState();
      expect(items[0].returnedBottle).toBe(false);
      
      toggleReturnedBottle(mockProduct.id);
      ({ items } = useCartStore.getState());
      expect(items[0].returnedBottle).toBe(true);
      
      toggleReturnedBottle(mockProduct.id);
      ({ items } = useCartStore.getState());
      expect(items[0].returnedBottle).toBe(false);
    });
  });

  describe('getItemPrice', () => {
    it('deve retornar o preço customizado se existir', () => {
      const { addItem, updateCustomPrice, getItemPrice } = useCartStore.getState();
      
      addItem(mockProduct);
      updateCustomPrice(mockProduct.id, 8.00);
      
      const { items } = useCartStore.getState();
      const price = getItemPrice(items[0]);
      expect(price).toBe(8.00);
    });

    it('deve retornar price_refill se casco foi retornado', () => {
      const { addItem, getItemPrice } = useCartStore.getState();
      
      addItem(mockProduct, 1, true);
      
      const { items } = useCartStore.getState();
      const price = getItemPrice(items[0]);
      expect(price).toBe(mockProduct.price_refill);
    });

    it('deve retornar price_full se casco não foi retornado', () => {
      const { addItem, getItemPrice } = useCartStore.getState();
      
      addItem(mockProduct);
      
      const { items } = useCartStore.getState();
      const price = getItemPrice(items[0]);
      expect(price).toBe(mockProduct.price_full);
    });
  });

  describe('getTotal', () => {
    it('deve calcular o total corretamente com um item', () => {
      const { addItem, getTotal } = useCartStore.getState();
      
      addItem(mockProduct, 2);
      
      const total = getTotal();
      expect(total).toBe(mockProduct.price_full * 2);
    });

    it('deve calcular o total corretamente com múltiplos itens', () => {
      const { addItem, getTotal } = useCartStore.getState();
      const product2: Product = {
        ...mockProduct,
        id: 2,
        name: 'Gás 13kg',
        type: 'gas',
        price_refill: 50.00,
        price_full: 60.00,
      };
      
      addItem(mockProduct, 2);
      addItem(product2, 1);
      
      const total = getTotal();
      expect(total).toBe(mockProduct.price_full * 2 + product2.price_full * 1);
    });

    it('deve considerar preços customizados no total', () => {
      const { addItem, updateCustomPrice, getTotal } = useCartStore.getState();
      
      addItem(mockProduct, 2);
      updateCustomPrice(mockProduct.id, 8.00);
      
      const total = getTotal();
      expect(total).toBe(8.00 * 2);
    });

    it('deve considerar casco retornado no total', () => {
      const { addItem, toggleReturnedBottle, getTotal } = useCartStore.getState();
      
      addItem(mockProduct, 2, true);
      
      const total = getTotal();
      expect(total).toBe(mockProduct.price_refill * 2);
    });
  });

  describe('clear', () => {
    it('deve limpar todos os itens do carrinho', () => {
      const { addItem, clear } = useCartStore.getState();
      
      addItem(mockProduct);
      addItem({ ...mockProduct, id: 2 });
      
      let { items } = useCartStore.getState();
      expect(items).toHaveLength(2);
      
      clear();
      
      ({ items } = useCartStore.getState());
      expect(items).toHaveLength(0);
    });
  });
});

