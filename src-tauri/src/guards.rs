use crate::auth::AuthState;
use crate::errors::{AppError, Result};
use crate::models::SafeUser;
use tauri::State;

pub fn get_authenticated_user(auth_state: &State<AuthState>) -> Result<SafeUser> {
    auth_state
        .user
        .lock()
        .unwrap()
        .clone()
        .ok_or_else(|| AppError::Auth("User not authenticated".to_string()))
}

pub fn require_admin(auth_state: &State<AuthState>) -> Result<SafeUser> {
    let user = get_authenticated_user(auth_state)?;
    if user.role != "admin" {
        return Err(AppError::Auth("Admin access required".to_string()));
    }
    Ok(user)
}
