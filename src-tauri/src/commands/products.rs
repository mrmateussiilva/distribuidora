use crate::auth::AuthState;
use crate::db::{products, DbPool};
use crate::errors::Result;
use crate::guards;
use crate::models::{CreateProductPayload, Product, UpdateProductPayload};
use tauri::State;

#[tauri::command]
pub async fn get_products(
    pool: State<'_, DbPool>,
    auth_state: State<'_, AuthState>,
) -> Result<Vec<Product>> {
    let _user = guards::get_authenticated_user(&auth_state)?;
    products::get_all_products(pool.inner()).await
}

#[tauri::command]
pub async fn get_product(
    id: i64,
    pool: State<'_, DbPool>,
    auth_state: State<'_, AuthState>,
) -> Result<Product> {
    let _user = guards::get_authenticated_user(&auth_state)?;
    products::get_product_by_id(pool.inner(), id).await
}

#[tauri::command]
pub async fn create_product(
    payload: CreateProductPayload,
    pool: State<'_, DbPool>,
    auth_state: State<'_, AuthState>,
) -> Result<i64> {
    let _user = guards::get_authenticated_user(&auth_state)?;
    products::create_product(pool.inner(), payload).await
}

#[tauri::command]
pub async fn update_product(
    id: i64,
    payload: UpdateProductPayload,
    pool: State<'_, DbPool>,
    auth_state: State<'_, AuthState>,
) -> Result<()> {
    let _user = guards::get_authenticated_user(&auth_state)?;
    products::update_product(pool.inner(), id, payload).await
}

#[tauri::command]
pub async fn delete_product(
    id: i64,
    pool: State<'_, DbPool>,
    auth_state: State<'_, AuthState>,
) -> Result<()> {
    let _user = guards::get_authenticated_user(&auth_state)?;
    products::delete_product(pool.inner(), id).await
}

