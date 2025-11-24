use crate::auth::AuthState;
use crate::db::{orders, DbPool};
use crate::errors::Result;
use crate::guards;
use crate::models::{CreateOrderPayload, UpdateOrderPayload, OrderWithCustomer, OrderWithItems};
use tauri::State;

#[tauri::command]
pub async fn create_order(
    payload: CreateOrderPayload,
    pool: State<'_, DbPool>,
    auth_state: State<'_, AuthState>,
) -> Result<i64> {
    let _user = guards::get_authenticated_user(&auth_state)?;
    orders::create_order(pool.inner(), payload).await
}

#[tauri::command]
pub async fn get_orders(
    pool: State<'_, DbPool>,
    auth_state: State<'_, AuthState>,
) -> Result<Vec<OrderWithCustomer>> {
    let _user = guards::get_authenticated_user(&auth_state)?;
    orders::get_all_orders(pool.inner()).await
}

#[tauri::command]
pub async fn get_order(
    id: i64,
    pool: State<'_, DbPool>,
    auth_state: State<'_, AuthState>,
) -> Result<OrderWithItems> {
    let _user = guards::get_authenticated_user(&auth_state)?;
    orders::get_order_by_id(pool.inner(), id).await
}

#[tauri::command]
pub async fn get_orders_by_customer(
    customer_id: i64,
    pool: State<'_, DbPool>,
    auth_state: State<'_, AuthState>,
) -> Result<Vec<OrderWithCustomer>> {
    let _user = guards::get_authenticated_user(&auth_state)?;
    orders::get_orders_by_customer(pool.inner(), customer_id).await
}

#[tauri::command]
pub async fn update_order(
    id: i64,
    payload: UpdateOrderPayload,
    pool: State<'_, DbPool>,
    auth_state: State<'_, AuthState>,
) -> Result<()> {
    let _user = guards::require_admin(&auth_state)?;
    orders::update_order(pool.inner(), id, payload).await
}

#[tauri::command]
pub async fn delete_order(
    id: i64,
    pool: State<'_, DbPool>,
    auth_state: State<'_, AuthState>,
) -> Result<()> {
    let _user = guards::require_admin(&auth_state)?;
    orders::delete_order(pool.inner(), id).await
}

