use super::DbPool;
use crate::{errors::{AppError, Result}, models::{User, UserListItem, CreateUserPayload, UpdateUserPayload}};
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
    Argon2,
};

pub async fn get_user_by_username(pool: &DbPool, username: &str) -> Result<User> {
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE username = ?")
        .bind(username)
        .fetch_one(pool)
        .await?;

    Ok(user)
}

pub async fn get_user_by_id(pool: &DbPool, id: i64) -> Result<User> {
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = ?")
        .bind(id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("User with id {} not found", id)))?;

    Ok(user)
}

pub async fn get_all_users(pool: &DbPool) -> Result<Vec<UserListItem>> {
    let users = sqlx::query_as::<_, UserListItem>(
        "SELECT id, username, role, created_at FROM users ORDER BY created_at DESC"
    )
    .fetch_all(pool)
    .await?;
    
    Ok(users)
}

pub async fn create_user(
    pool: &DbPool,
    payload: CreateUserPayload,
) -> Result<i64> {
    // Validação
    if payload.username.is_empty() {
        return Err(AppError::Validation("Username cannot be empty".to_string()));
    }

    if payload.password.is_empty() {
        return Err(AppError::Validation("Password cannot be empty".to_string()));
    }

    if payload.password.len() < 4 {
        return Err(AppError::Validation("Password must be at least 4 characters".to_string()));
    }

    if !["admin", "operator"].contains(&payload.role.as_str()) {
        return Err(AppError::Validation("Invalid role. Must be 'admin' or 'operator'".to_string()));
    }

    // Verifica se o usuário já existe
    let user_exists: (bool,) = sqlx::query_as(
        "SELECT EXISTS(SELECT 1 FROM users WHERE username = ?)"
    )
    .bind(&payload.username)
    .fetch_one(pool)
    .await?;

    if user_exists.0 {
        return Err(AppError::Validation("Username already exists".to_string()));
    }

    // Hash da senha
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2
        .hash_password(payload.password.as_bytes(), &salt)
        .map_err(|e| AppError::PasswordHashing(e.to_string()))?
        .to_string();

    let id = sqlx::query(
        "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)"
    )
    .bind(&payload.username)
    .bind(password_hash)
    .bind(&payload.role)
    .execute(pool)
    .await?
    .last_insert_rowid();

    Ok(id)
}

pub async fn update_user(
    pool: &DbPool,
    id: i64,
    payload: UpdateUserPayload,
) -> Result<()> {
    // Verifica se existe
    get_user_by_id(pool, id).await?;

    // Validações
    if let Some(ref username) = payload.username {
        if username.is_empty() {
            return Err(AppError::Validation("Username cannot be empty".to_string()));
        }

        // Verifica se outro usuário já tem esse username
        let user_exists: (bool,) = sqlx::query_as(
            "SELECT EXISTS(SELECT 1 FROM users WHERE username = ? AND id != ?)"
        )
        .bind(username)
        .bind(id)
        .fetch_one(pool)
        .await?;

        if user_exists.0 {
            return Err(AppError::Validation("Username already exists".to_string()));
        }
    }

    if let Some(ref password) = payload.password {
        if password.is_empty() {
            return Err(AppError::Validation("Password cannot be empty".to_string()));
        }

        if password.len() < 4 {
            return Err(AppError::Validation("Password must be at least 4 characters".to_string()));
        }
    }

    if let Some(ref role) = payload.role {
        if !["admin", "operator"].contains(&role.as_str()) {
            return Err(AppError::Validation("Invalid role. Must be 'admin' or 'operator'".to_string()));
        }
    }

    // Constrói query dinamicamente
    let mut query_builder = sqlx::QueryBuilder::new("UPDATE users SET ");
    let mut has_updates = false;

    if let Some(username) = &payload.username {
        if has_updates {
            query_builder.push(", ");
        }
        query_builder.push("username = ");
        query_builder.push_bind(username);
        has_updates = true;
    }

    if let Some(password) = &payload.password {
        // Hash da nova senha
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        let password_hash = argon2
            .hash_password(password.as_bytes(), &salt)
            .map_err(|e| AppError::PasswordHashing(e.to_string()))?
            .to_string();

        if has_updates {
            query_builder.push(", ");
        }
        query_builder.push("password_hash = ");
        query_builder.push_bind(password_hash);
        has_updates = true;
    }

    if let Some(role) = &payload.role {
        if has_updates {
            query_builder.push(", ");
        }
        query_builder.push("role = ");
        query_builder.push_bind(role);
        has_updates = true;
    }

    if !has_updates {
        return Ok(()); // Nada para atualizar
    }

    query_builder.push(", updated_at = CURRENT_TIMESTAMP WHERE id = ");
    query_builder.push_bind(id);

    query_builder.build().execute(pool).await?;

    Ok(())
}

pub async fn delete_user(pool: &DbPool, id: i64) -> Result<()> {
    // Verifica se existe
    let user = get_user_by_id(pool, id).await?;

    // Não permite deletar o usuário admin padrão
    if user.username == "admin" {
        return Err(AppError::Validation("Cannot delete the default admin user".to_string()));
    }

    sqlx::query("DELETE FROM users WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await?;

    Ok(())
}
