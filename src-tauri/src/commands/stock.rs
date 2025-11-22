use crate::auth::AuthState;
use crate::db::{stock, DbPool};
use crate::errors::Result;
use crate::guards;
use crate::models::StockMovementWithProduct;
use tauri::State;

#[tauri::command]
pub async fn stock_in(
    product_id: i64,
    quantity: i64,
    pool: State<'_, DbPool>,
    auth_state: State<'_, AuthState>,
) -> Result<()> {
    let _user = guards::get_authenticated_user(&auth_state)?;
    stock::stock_in(pool.inner(), product_id, quantity).await
}

#[tauri::command]
pub async fn stock_out(
    product_id: i64,
    quantity: i64,
    pool: State<'_, DbPool>,
    auth_state: State<'_, AuthState>,
) -> Result<()> {
    let _user = guards::get_authenticated_user(&auth_state)?;
    stock::stock_out(pool.inner(), product_id, quantity).await
}

#[tauri::command]
pub async fn stock_adjust(
    product_id: i64,
    quantity: i64,
    pool: State<'_, DbPool>,
    auth_state: State<'_, AuthState>,
) -> Result<()> {
    let _user = guards::get_authenticated_user(&auth_state)?;
    stock::stock_adjust(pool.inner(), product_id, quantity).await
}

#[tauri::command]
pub async fn get_stock_movements(
    pool: State<'_, DbPool>,
    auth_state: State<'_, AuthState>,
) -> Result<Vec<StockMovementWithProduct>> {
    let _user = guards::get_authenticated_user(&auth_state)?;
    stock::get_all_movements(pool.inner()).await
}

