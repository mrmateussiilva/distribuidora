use crate::db::products;
use crate::models::{Product, CreateProductPayload, UpdateProductPayload};
use crate::errors::AppError;
use sqlx::SqlitePool;
use std::sync::Mutex;
use tauri::State;

pub struct AppState {
    pub db: Mutex<Option<SqlitePool>>,
}

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
pub async fn get_products(state: State<'_, AppState>) -> Result<Vec<Product>, String> {
    let pool = get_db(&state)?;
    products::get_all_products(&pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_product(id: i64, state: State<'_, AppState>) -> Result<Product, String> {
    let pool = get_db(&state)?;
    products::get_product_by_id(&pool, id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_product(
    payload: CreateProductPayload,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    let pool = get_db(&state)?;
    products::create_product(&pool, payload)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_product(
    id: i64,
    payload: UpdateProductPayload,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let pool = get_db(&state)?;
    products::update_product(&pool, id, payload)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_product(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let pool = get_db(&state)?;
    products::delete_product(&pool, id)
        .await
        .map_err(|e| e.to_string())
}

