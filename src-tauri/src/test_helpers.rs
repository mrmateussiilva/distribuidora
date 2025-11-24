#[cfg(test)]
pub mod test_helpers {
    use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};

    /// Cria um pool de conexões SQLite em memória para testes
    pub async fn setup_test_db() -> SqlitePool {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .expect("Failed to create test database pool");

        // Aplica migrações
        let migrator = sqlx::migrate!("./migrations");
        migrator
            .run(&pool)
            .await
            .expect("Failed to run migrations on test database");

        pool
    }

    /// Limpa todas as tabelas do banco de teste
    pub async fn cleanup_test_db(pool: &SqlitePool) {
        sqlx::query("DELETE FROM stock_movements").execute(pool).await.ok();
        sqlx::query("DELETE FROM order_items").execute(pool).await.ok();
        sqlx::query("DELETE FROM orders").execute(pool).await.ok();
        sqlx::query("DELETE FROM products").execute(pool).await.ok();
        sqlx::query("DELETE FROM customers").execute(pool).await.ok();
        sqlx::query("DELETE FROM users").execute(pool).await.ok();
    }
}

