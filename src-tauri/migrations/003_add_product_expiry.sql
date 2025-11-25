-- Adicionar campos de vencimento para produtos de água
ALTER TABLE products ADD COLUMN expiry_month INTEGER;
ALTER TABLE products ADD COLUMN expiry_year INTEGER;

