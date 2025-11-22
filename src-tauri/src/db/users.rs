use super::DbPool;
use crate::{errors::Result, models::User};

pub async fn get_user_by_username(pool: &DbPool, username: &str) -> Result<User> {
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE username = ?")
        .bind(username)
        .fetch_one(pool)
        .await?;

    Ok(user)
}
