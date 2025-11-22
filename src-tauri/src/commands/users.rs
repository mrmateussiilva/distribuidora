use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use tauri::State;

use crate::{
    auth::AuthState,
    db::{self, DbPool},
    errors::{AppError, Result},
    models::SafeUser,
};

// This is the internal function that can be called from `main.rs`
pub(crate) async fn _internal_seed_admin_user(pool: &DbPool, password: &str) -> Result<()> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| AppError::PasswordHashing(e.to_string()))?
        .to_string();

    // Check if admin already exists
    let admin_exists: (bool,) =
        sqlx::query_as("SELECT EXISTS(SELECT 1 FROM users WHERE username = 'admin')")
            .fetch_one(pool)
            .await?;

    if !admin_exists.0 {
        sqlx::query("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)")
            .bind("admin")
            .bind(password_hash)
            .bind("admin")
            .execute(pool)
            .await?;
    }

    Ok(())
}

#[tauri::command]
pub async fn seed_admin_user(pool: State<'_, DbPool>, password: &str) -> Result<()> {
    _internal_seed_admin_user(pool.inner(), password).await
}

#[tauri::command]
pub async fn login(
    pool: State<'_, DbPool>,
    auth_state: State<'_, AuthState>,
    username: &str,
    password: &str,
) -> Result<SafeUser> {
    let user = match db::users::get_user_by_username(pool.inner(), username).await {
        Ok(user) => user,
        Err(AppError::Database(sqlx::Error::RowNotFound)) => {
            return Err(AppError::InvalidCredentials);
        }
        Err(e) => return Err(e),
    };

    let parsed_hash = PasswordHash::new(&user.password_hash)
        .map_err(|e| AppError::PasswordHashing(e.to_string()))?;

    Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .map_err(|_| AppError::InvalidCredentials)?;

    let safe_user = SafeUser {
        id: user.id,
        username: user.username,
        role: user.role,
    };

    *auth_state.user.lock().unwrap() = Some(safe_user.clone());

    Ok(safe_user)
}

#[tauri::command]
pub async fn logout(auth_state: State<'_, AuthState>) -> Result<()> {
    *auth_state.user.lock().unwrap() = None;
    Ok(())
}

#[tauri::command]
pub async fn get_current_user(auth_state: State<'_, AuthState>) -> Result<Option<SafeUser>> {
    Ok(auth_state.user.lock().unwrap().clone())
}
