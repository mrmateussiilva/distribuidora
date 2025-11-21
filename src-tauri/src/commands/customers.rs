use crate::db::customers;
use crate::models::{Customer, CreateCustomerPayload, UpdateCustomerPayload};
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
pub async fn get_customers(state: State<'_, AppState>) -> Result<Vec<Customer>, String> {
    let pool = get_db(&state)?;
    customers::get_all_customers(&pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_customer(id: i64, state: State<'_, AppState>) -> Result<Customer, String> {
    let pool = get_db(&state)?;
    customers::get_customer_by_id(&pool, id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn search_customers_by_phone(
    phone: String,
    state: State<'_, AppState>,
) -> Result<Vec<Customer>, String> {
    let pool = get_db(&state)?;
    customers::search_customers_by_phone(&pool, &phone)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_customer(
    payload: CreateCustomerPayload,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    let pool = get_db(&state)?;
    customers::create_customer(&pool, payload)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_customer(
    id: i64,
    payload: UpdateCustomerPayload,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let pool = get_db(&state)?;
    customers::update_customer(&pool, id, payload)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_customer(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let pool = get_db(&state)?;
    customers::delete_customer(&pool, id)
        .await
        .map_err(|e| e.to_string())
}

