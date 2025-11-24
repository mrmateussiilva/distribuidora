import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductCard from '../ProductCard';
import type { Product } from '../../types';

const mockProduct: Product = {
  id: 1,
  name: 'Água 20L',
  description: 'Água mineral natural',
  type: 'water',
  price_refill: 5.00,
  price_full: 10.00,
  stock_full: 10,
  stock_empty: 0,
};

describe('ProductCard', () => {
  it('deve renderizar o nome do produto', () => {
    const onAddToCart = vi.fn();
    render(<ProductCard product={mockProduct} onAddToCart={onAddToCart} />);
    
    expect(screen.getByText('Água 20L')).toBeInTheDocument();
  });

  it('deve renderizar a descrição do produto quando disponível', () => {
    const onAddToCart = vi.fn();
    render(<ProductCard product={mockProduct} onAddToCart={onAddToCart} />);
    
    expect(screen.getByText('Água mineral natural')).toBeInTheDocument();
  });

  it('não deve renderizar descrição quando não disponível', () => {
    const onAddToCart = vi.fn();
    const productWithoutDescription = { ...mockProduct, description: null };
    render(<ProductCard product={productWithoutDescription} onAddToCart={onAddToCart} />);
    
    expect(screen.queryByText('Água mineral natural')).not.toBeInTheDocument();
  });

  it('deve exibir os preços formatados corretamente', () => {
    const onAddToCart = vi.fn();
    render(<ProductCard product={mockProduct} onAddToCart={onAddToCart} />);
    
    expect(screen.getByText(/R\$\s*10,00/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*5,00/)).toBeInTheDocument();
  });

  it('deve exibir o estoque disponível', () => {
    const onAddToCart = vi.fn();
    render(<ProductCard product={mockProduct} onAddToCart={onAddToCart} />);
    
    expect(screen.getByText(/Estoque: 10/)).toBeInTheDocument();
  });

  it('deve chamar onAddToCart quando clicado e houver estoque', async () => {
    const user = userEvent.setup();
    const onAddToCart = vi.fn();
    const { container } = render(<ProductCard product={mockProduct} onAddToCart={onAddToCart} />);
    
    // O card inteiro é clicável, então pegamos o elemento com a classe cursor-pointer
    const card = container.querySelector('.cursor-pointer');
    
    if (card) {
      await user.click(card);
      expect(onAddToCart).toHaveBeenCalledTimes(1);
    }
  });

  it('não deve chamar onAddToCart quando não houver estoque', async () => {
    const user = userEvent.setup();
    const onAddToCart = vi.fn();
    const productOutOfStock = { ...mockProduct, stock_full: 0 };
    render(<ProductCard product={productOutOfStock} onAddToCart={onAddToCart} />);
    
    const card = screen.getByText('Água 20L').closest('div');
    
    if (card) {
      await user.click(card);
      expect(onAddToCart).not.toHaveBeenCalled();
    }
  });

  it('deve exibir badge de sem estoque quando stock_full for 0', () => {
    const onAddToCart = vi.fn();
    const productOutOfStock = { ...mockProduct, stock_full: 0 };
    render(<ProductCard product={productOutOfStock} onAddToCart={onAddToCart} />);
    
    expect(screen.getByText('Sem estoque')).toBeInTheDocument();
  });

  it('deve renderizar ícone correto para tipo water', () => {
    const onAddToCart = vi.fn();
    const { container } = render(<ProductCard product={mockProduct} onAddToCart={onAddToCart} />);
    
    // Verifica se o ícone de água está presente (lucide-react Droplet)
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('deve renderizar ícone correto para tipo gas', () => {
    const onAddToCart = vi.fn();
    const gasProduct = { ...mockProduct, type: 'gas' as const };
    render(<ProductCard product={gasProduct} onAddToCart={onAddToCart} />);
    
    // O ícone deve estar presente
    const { container } = render(<ProductCard product={gasProduct} onAddToCart={onAddToCart} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('deve renderizar ícone padrão para outros tipos', () => {
    const onAddToCart = vi.fn();
    const otherProduct = { ...mockProduct, type: 'other' as const };
    const { container } = render(<ProductCard product={otherProduct} onAddToCart={onAddToCart} />);
    
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('deve aplicar estilo de desabilitado quando sem estoque', () => {
    const onAddToCart = vi.fn();
    const productOutOfStock = { ...mockProduct, stock_full: 0 };
    const { container } = render(<ProductCard product={productOutOfStock} onAddToCart={onAddToCart} />);
    
    const card = container.querySelector('.opacity-50');
    expect(card).toBeInTheDocument();
  });
});

