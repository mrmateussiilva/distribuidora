use crate::db::stock;
use crate::models::DashboardStats;
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
pub async fn get_dashboard_stats(
    state: State<'_, AppState>,
) -> Result<DashboardStats, String> {
    let pool = get_db(&state)?;
    stock::get_dashboard_stats(&pool)
        .await
        .map_err(|e| e.to_string())
}

