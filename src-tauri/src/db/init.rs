use sqlx::{
    migrate::{MigrateError, Migrator},
    sqlite::SqlitePoolOptions,
    SqlitePool,
};

pub type DbPool = SqlitePool;

static MIGRATOR: Migrator = sqlx::migrate!("./migrations");

pub async fn init_db() -> Result<SqlitePool, Box<dyn std::error::Error>> {
    // Obtém o diretório de dados do app usando dirs crate
    let app_data = dirs::data_dir()
        .ok_or("Failed to get app data directory")?
        .join("distribbuidora-pdv");
    
    // Garante que o diretório existe
    std::fs::create_dir_all(&app_data)
        .map_err(|e| format!("Failed to create app data directory: {} (path: {:?})", e, app_data))?;
    
    // Verifica permissões do diretório
    let metadata = std::fs::metadata(&app_data)
        .map_err(|e| format!("Failed to check app data directory permissions: {} (path: {:?})", e, app_data))?;
    
    if !metadata.is_dir() {
        return Err(format!("App data path exists but is not a directory: {:?}", app_data).into());
    }
    
    let db_path = app_data.join("distribbuidora.db");
    
    // Converte o caminho para string absoluta
    let db_path_str = db_path
        .to_str()
        .ok_or(format!("Invalid database path: {:?}", db_path))?
        .to_string();
    
    // SQLite URL - usa sqlite:// para caminhos de arquivo.
    // No Windows, precisamos usar barras normais ou barras invertidas duplicadas
    let db_url = format!("sqlite:{}", db_path_str.replace("\\", "/"));

    // Cria pool de conexões
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(&db_url)
        .await
        .map_err(|e| format!("Failed to connect to database at {}: {} (dir exists: {}, dir writable: {}, path: {:?})", 
            db_url, 
            e, 
            app_data.exists(),
            metadata.permissions().readonly() == false,
            db_path))?;

    apply_migrations(pool, &db_url, &db_path).await
}

async fn apply_migrations(
    pool: SqlitePool,
    db_url: &str,
    db_path: &std::path::Path,
) -> Result<SqlitePool, Box<dyn std::error::Error>> {
    match MIGRATOR.run(&pool).await {
        Ok(_) => Ok(pool),
        Err(MigrateError::VersionMismatch(_)) => {
            // Se houver incompatibilidade de versão, deleta o banco e recria
            drop(pool);

            if db_path.exists() {
                std::fs::remove_file(db_path)
                    .map_err(|e| format!("Failed to remove old database: {}", e))?;
            }

            // Garante que o diretório existe antes de reconectar
            if let Some(parent_dir) = db_path.parent() {
                std::fs::create_dir_all(parent_dir)
                    .map_err(|e| format!("Failed to recreate app data directory: {} (path: {:?})", e, parent_dir))?;
            }

            let new_pool = SqlitePoolOptions::new()
                .max_connections(1)
                .connect(db_url)
                .await
                .map_err(|e| format!("Failed to reconnect to database: {} (path: {:?})", e, db_path))?;

            MIGRATOR.run(&new_pool).await?;

            Ok(new_pool)
        }
        Err(e) => Err(Box::new(e)),
    }
}
