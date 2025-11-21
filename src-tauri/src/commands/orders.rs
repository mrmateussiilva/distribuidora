use crate::db::orders;
use crate::models::{CreateOrderPayload, OrderWithCustomer, OrderWithItems};
use crate::errors::AppError;
use sqlx::SqlitePool;
use tauri::State;

use super::products::AppState;

fn get_db(state: &State<'_, AppState>) -> Result<SqlitePool, AppError> {
    state
        .db
        .lock()
        .unwrap()
        .as_ref()
        .ok_or_else(|| AppError::Database(sqlx::Error::PoolClosed))
        .cloned()
}

#[tauri::command]
pub async fn create_order(
    payload: CreateOrderPayload,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    let pool = get_db(&state)?;
    orders::create_order(&pool, payload)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_orders(state: State<'_, AppState>) -> Result<Vec<OrderWithCustomer>, String> {
    let pool = get_db(&state)?;
    orders::get_all_orders(&pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_order(id: i64, state: State<'_, AppState>) -> Result<OrderWithItems, String> {
    let pool = get_db(&state)?;
    orders::get_order_by_id(&pool, id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_orders_by_customer(
    customer_id: i64,
    state: State<'_, AppState>,
) -> Result<Vec<OrderWithCustomer>, String> {
    let pool = get_db(&state)?;
    orders::get_orders_by_customer(&pool, customer_id)
        .await
        .map_err(|e| e.to_string())
}

