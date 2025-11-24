use crate::auth::AuthState;
use crate::db::{customers, DbPool};
use crate::errors::Result;
use crate::guards;
use crate::models::{CreateCustomerPayload, Customer, UpdateCustomerPayload};
use tauri::State;

#[tauri::command]
pub async fn get_customers(
    pool: State<'_, DbPool>,
    auth_state: State<'_, AuthState>,
) -> Result<Vec<Customer>> {
    let _user = guards::get_authenticated_user(&auth_state)?;
    customers::get_all_customers(pool.inner()).await
}

#[tauri::command]
pub async fn get_customer(
    id: i64,
    pool: State<'_, DbPool>,
    auth_state: State<'_, AuthState>,
) -> Result<Customer> {
    let _user = guards::get_authenticated_user(&auth_state)?;
    customers::get_customer_by_id(pool.inner(), id).await
}

#[tauri::command]
pub async fn search_customers_by_phone(
    phone: String,
    pool: State<'_, DbPool>,
    auth_state: State<'_, AuthState>,
) -> Result<Vec<Customer>> {
    let _user = guards::get_authenticated_user(&auth_state)?;
    customers::search_customers_by_phone(pool.inner(), &phone).await
}

#[tauri::command]
pub async fn create_customer(
    payload: CreateCustomerPayload,
    pool: State<'_, DbPool>,
    auth_state: State<'_, AuthState>,
) -> Result<i64> {
    let _user = guards::get_authenticated_user(&auth_state)?;
    customers::create_customer(pool.inner(), payload).await
}

#[tauri::command]
pub async fn update_customer(
    id: i64,
    payload: UpdateCustomerPayload,
    pool: State<'_, DbPool>,
    auth_state: State<'_, AuthState>,
) -> Result<()> {
    let _user = guards::get_authenticated_user(&auth_state)?;
    customers::update_customer(pool.inner(), id, payload).await
}

#[tauri::command]
pub async fn delete_customer(
    id: i64,
    pool: State<'_, DbPool>,
    auth_state: State<'_, AuthState>,
) -> Result<()> {
    let _user = guards::require_admin(&auth_state)?;
    customers::delete_customer(pool.inner(), id).await
}

