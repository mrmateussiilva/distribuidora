// ========== PRODUCTS ==========
export interface Product {
  id: number;
  name: string;
  description: string | null;
  type: "water" | "gas" | "coal" | "other";
  price_refill: number;
  price_full: number;
  stock_full: number;
  stock_empty: number;
}

export interface CreateProductPayload {
  name: string;
  description?: string | null;
  type: "water" | "gas" | "coal" | "other";
  price_refill: number;
  price_full: number;
  stock_full?: number;
  stock_empty?: number;
}

export interface UpdateProductPayload {
  name?: string;
  description?: string | null;
  type?: "water" | "gas" | "coal" | "other";
  price_refill?: number;
  price_full?: number;
  stock_full?: number;
  stock_empty?: number;
}

// ========== CUSTOMERS ==========
export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
}

export interface CreateCustomerPayload {
  name: string;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface UpdateCustomerPayload {
  name?: string;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
}

// ========== ORDERS ==========
export interface Order {
  id: number;
  customer_id: number | null;
  total: number;
  created_at: string;
}

export interface OrderWithCustomer {
  id: number;
  customer_id: number | null;
  customer_name: string | null;
  total: number;
  created_at: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  returned_bottle: boolean;
  unit_price: number;
}

export interface OrderItemPayload {
  product_id: number;
  quantity: number;
  returned_bottle: boolean;
  unit_price: number;
}

export interface CreateOrderPayload {
  customer_id?: number | null;
  items: OrderItemPayload[];
}

export interface UpdateOrderPayload {
  created_at?: string;
}

export interface OrderItemWithProduct {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  returned_bottle: boolean;
  unit_price: number;
}

export interface OrderWithItems {
  order: OrderWithCustomer;
  items: OrderItemWithProduct[];
}

// ========== STOCK MOVEMENTS ==========
export interface StockMovement {
  id: number;
  product_id: number;
  movement_type: "IN" | "OUT" | "ADJUST";
  quantity: number;
  created_at: string;
}

export interface StockMovementWithProduct {
  id: number;
  product_id: number;
  product_name: string;
  movement_type: "IN" | "OUT" | "ADJUST";
  quantity: number;
  created_at: string;
}

// ========== DASHBOARD ==========
export interface DashboardStats {
  sales_today: number;
  sales_month: number;
  critical_stock: Product[];
  top_products: TopProduct[];
  active_customers: number;
}

export interface TopProduct {
  product_id: number;
  product_name: string;
  total_quantity: number;
  total_revenue: number;
}

// ========== CART ==========
export interface CartItem {
  product: Product;
  quantity: number;
  returnedBottle: boolean;
  customPrice?: number; // Preço unitário customizado (opcional)
}

// ========== USERS ==========
export interface SafeUser {
  id: number;
  username: string;
  role: 'admin' | 'operator';
}
