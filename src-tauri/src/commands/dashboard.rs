use crate::auth::AuthState;
use crate::db::{stock, DbPool};
use crate::errors::Result;
use crate::guards;
use crate::models::DashboardStats;
use tauri::State;

#[tauri::command]
pub async fn get_dashboard_stats(
    pool: State<'_, DbPool>,
    auth_state: State<'_, AuthState>,
) -> Result<DashboardStats> {
    let _user = guards::get_authenticated_user(&auth_state)?;
    stock::get_dashboard_stats(pool.inner()).await
}

