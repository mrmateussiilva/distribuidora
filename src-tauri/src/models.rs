use serde::{Deserialize, Serialize};

// ========== PRODUCTS ==========
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct Product {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub r#type: String, // 'water', 'gas', 'coal', 'other'
    pub price_refill: f64,
    pub price_full: f64,
    pub stock_full: i64,
    pub stock_empty: i64,
    pub expiry_month: Option<i64>,
    pub expiry_year: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateProductPayload {
    pub name: String,
    pub description: Option<String>,
    pub r#type: String,
    pub price_refill: f64,
    pub price_full: f64,
    pub stock_full: Option<i64>,
    pub stock_empty: Option<i64>,
    pub expiry_month: Option<i64>,
    pub expiry_year: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateProductPayload {
    pub name: Option<String>,
    pub description: Option<String>,
    pub r#type: Option<String>,
    pub price_refill: Option<f64>,
    pub price_full: Option<f64>,
    pub stock_full: Option<i64>,
    pub stock_empty: Option<i64>,
    pub expiry_month: Option<i64>,
    pub expiry_year: Option<i64>,
}

// ========== CUSTOMERS ==========
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct Customer {
    pub id: i64,
    pub name: String,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCustomerPayload {
    pub name: String,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateCustomerPayload {
    pub name: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub notes: Option<String>,
}

// ========== ORDERS ==========
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Order {
    pub id: i64,
    pub customer_id: Option<i64>,
    pub total: f64,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct OrderWithCustomer {
    pub id: i64,
    pub customer_id: Option<i64>,
    pub customer_name: Option<String>,
    pub total: f64,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct OrderItem {
    pub id: i64,
    pub order_id: i64,
    pub product_id: i64,
    pub quantity: i64,
    pub returned_bottle: bool,
    pub unit_price: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OrderItemPayload {
    pub product_id: i64,
    pub quantity: i64,
    pub returned_bottle: bool,
    pub unit_price: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateOrderPayload {
    pub customer_id: Option<i64>,
    pub items: Vec<OrderItemPayload>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateOrderPayload {
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OrderWithItems {
    pub order: OrderWithCustomer,
    pub items: Vec<OrderItemWithProduct>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct OrderItemWithProduct {
    pub id: i64,
    pub order_id: i64,
    pub product_id: i64,
    pub product_name: String,
    pub quantity: i64,
    pub returned_bottle: bool,
    pub unit_price: f64,
}

// ========== STOCK MOVEMENTS ==========
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct StockMovement {
    pub id: i64,
    pub product_id: i64,
    pub movement_type: String, // 'IN', 'OUT', 'ADJUST'
    pub quantity: i64,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct StockMovementWithProduct {
    pub id: i64,
    pub product_id: i64,
    pub product_name: String,
    pub movement_type: String,
    pub quantity: i64,
    pub created_at: String,
}

// ========== DASHBOARD ==========
#[derive(Debug, Serialize, Deserialize)]
pub struct DashboardStats {
    pub sales_today: f64,
    pub sales_month: f64,
    pub critical_stock: Vec<Product>,
    pub top_products: Vec<TopProduct>,
    pub active_customers: i64,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct TopProduct {
    pub product_id: i64,
    pub product_name: String,
    pub total_quantity: i64,
    pub total_revenue: f64,
}

// ========== USERS ==========
#[derive(Debug, Deserialize, sqlx::FromRow)]
#[allow(dead_code)]
pub struct User {
    pub id: i64,
    pub username: String,
    pub password_hash: String,
    pub role: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SafeUser {
    pub id: i64,
    pub username: String,
    pub role: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct UserListItem {
    pub id: i64,
    pub username: String,
    pub role: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateUserPayload {
    pub username: String,
    pub password: String,
    pub role: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateUserPayload {
    pub username: Option<String>,
    pub password: Option<String>,
    pub role: Option<String>,
}
