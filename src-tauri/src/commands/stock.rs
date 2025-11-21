use crate::db::stock;
use crate::models::StockMovementWithProduct;
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
pub async fn stock_in(
    product_id: i64,
    quantity: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let pool = get_db(&state)?;
    stock::stock_in(&pool, product_id, quantity)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn stock_out(
    product_id: i64,
    quantity: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let pool = get_db(&state)?;
    stock::stock_out(&pool, product_id, quantity)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn stock_adjust(
    product_id: i64,
    quantity: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let pool = get_db(&state)?;
    stock::stock_adjust(&pool, product_id, quantity)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_stock_movements(
    state: State<'_, AppState>,
) -> Result<Vec<StockMovementWithProduct>, String> {
    let pool = get_db(&state)?;
    stock::get_all_movements(&pool)
        .await
        .map_err(|e| e.to_string())
}

