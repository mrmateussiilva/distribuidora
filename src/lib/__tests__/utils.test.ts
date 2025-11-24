import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn', () => {
  it('deve combinar classes CSS corretamente', () => {
    const result = cn('foo', 'bar');
    expect(result).toBe('foo bar');
  });

  it('deve mesclar classes condicionais', () => {
    const result = cn('foo', false && 'bar', 'baz');
    expect(result).toBe('foo baz');
  });

  it('deve mesclar classes com objetos condicionais', () => {
    const result = cn('foo', { bar: true, baz: false });
    expect(result).toBe('foo bar');
  });

  it('deve mesclar classes com arrays', () => {
    const result = cn(['foo', 'bar'], 'baz');
    expect(result).toBe('foo bar baz');
  });

  it('deve resolver conflitos de classes do Tailwind', () => {
    // tailwind-merge deve resolver conflitos como p-2 e p-4
    const result = cn('p-2', 'p-4');
    expect(result).toBe('p-4');
  });

  it('deve lidar com valores undefined e null', () => {
    const result = cn('foo', undefined, null, 'bar');
    expect(result).toBe('foo bar');
  });
});

