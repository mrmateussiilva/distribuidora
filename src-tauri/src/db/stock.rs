use crate::models::{StockMovementWithProduct, Product, TopProduct, DashboardStats};
use crate::errors::AppError;
use sqlx::SqlitePool;

pub async fn stock_in(pool: &SqlitePool, product_id: i64, quantity: i64) -> Result<(), AppError> {
    if quantity <= 0 {
        return Err(AppError::Validation("Quantity must be positive".to_string()));
    }

    let mut tx = pool.begin().await?;

    // Atualiza estoque
    sqlx::query("UPDATE products SET stock_full = stock_full + ? WHERE id = ?")
        .bind(quantity)
        .bind(product_id)
        .execute(&mut *tx)
        .await?;

    // Registra movimentação
    sqlx::query(
        "INSERT INTO stock_movements (product_id, movement_type, quantity)
         VALUES (?, 'IN', ?)"
    )
    .bind(product_id)
    .bind(quantity)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;
    Ok(())
}

pub async fn stock_out(pool: &SqlitePool, product_id: i64, quantity: i64) -> Result<(), AppError> {
    if quantity <= 0 {
        return Err(AppError::Validation("Quantity must be positive".to_string()));
    }

    // Verifica estoque disponível
    let stock: (i64,) = sqlx::query_as(
        "SELECT stock_full FROM products WHERE id = ?"
    )
    .bind(product_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Product {} not found", product_id)))?;

    if stock.0 < quantity {
        return Err(AppError::BusinessLogic(
            format!("Insufficient stock. Available: {}, Requested: {}", stock.0, quantity)
        ));
    }

    let mut tx = pool.begin().await?;

    // Atualiza estoque
    sqlx::query("UPDATE products SET stock_full = stock_full - ? WHERE id = ?")
        .bind(quantity)
        .bind(product_id)
        .execute(&mut *tx)
        .await?;

    // Registra movimentação
    sqlx::query(
        "INSERT INTO stock_movements (product_id, movement_type, quantity)
         VALUES (?, 'OUT', ?)"
    )
    .bind(product_id)
    .bind(quantity)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;
    Ok(())
}

pub async fn stock_adjust(pool: &SqlitePool, product_id: i64, quantity: i64) -> Result<(), AppError> {
    let mut tx = pool.begin().await?;

    // Atualiza estoque (ajuste pode ser positivo ou negativo)
    sqlx::query("UPDATE products SET stock_full = stock_full + ? WHERE id = ?")
        .bind(quantity)
        .bind(product_id)
        .execute(&mut *tx)
        .await?;

    // Registra movimentação
    sqlx::query(
        "INSERT INTO stock_movements (product_id, movement_type, quantity)
         VALUES (?, 'ADJUST', ?)"
    )
    .bind(product_id)
    .bind(quantity)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;
    Ok(())
}

pub async fn get_all_movements(pool: &SqlitePool) -> Result<Vec<StockMovementWithProduct>, AppError> {
    let movements = sqlx::query_as::<_, StockMovementWithProduct>(
        "SELECT sm.id, sm.product_id, p.name as product_name, sm.movement_type,
                sm.quantity, sm.created_at
         FROM stock_movements sm
         JOIN products p ON sm.product_id = p.id
         ORDER BY sm.created_at DESC"
    )
    .fetch_all(pool)
    .await?;
    
    Ok(movements)
}

pub async fn get_critical_stock(pool: &SqlitePool, threshold: i64) -> Result<Vec<Product>, AppError> {
    let products = sqlx::query_as::<_, Product>(
        "SELECT * FROM products WHERE stock_full <= ? ORDER BY stock_full ASC"
    )
    .bind(threshold)
    .fetch_all(pool)
    .await?;
    
    Ok(products)
}

pub async fn get_top_products(
    pool: &SqlitePool,
    limit: i64,
    days: i64,
) -> Result<Vec<TopProduct>, AppError> {
    let products = sqlx::query_as::<_, TopProduct>(
        "SELECT 
            oi.product_id,
            p.name as product_name,
            SUM(oi.quantity) as total_quantity,
            SUM(oi.quantity * oi.unit_price) as total_revenue
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         JOIN orders o ON oi.order_id = o.id
         WHERE o.created_at >= datetime('now', '-' || ? || ' days')
         GROUP BY oi.product_id, p.name
         ORDER BY total_quantity DESC
         LIMIT ?"
    )
    .bind(days)
    .bind(limit)
    .fetch_all(pool)
    .await?;
    
    Ok(products)
}

pub async fn get_dashboard_stats(pool: &SqlitePool) -> Result<DashboardStats, AppError> {
    // Vendas do dia
    let sales_today: (Option<f64>,) = sqlx::query_as(
        "SELECT COALESCE(SUM(total), 0) FROM orders 
         WHERE DATE(created_at) = DATE('now')"
    )
    .fetch_one(pool)
    .await?;

    // Vendas do mês
    let sales_month: (Option<f64>,) = sqlx::query_as(
        "SELECT COALESCE(SUM(total), 0) FROM orders 
         WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')"
    )
    .fetch_one(pool)
    .await?;

    // Estoque crítico (threshold = 10)
    let critical_stock = get_critical_stock(pool, 10).await?;

    // Top produtos (últimos 30 dias)
    let top_products = get_top_products(pool, 5, 30).await?;

    // Clientes ativos (com pedidos no último mês)
    let active_customers: (i64,) = sqlx::query_as(
        "SELECT COUNT(DISTINCT customer_id) FROM orders 
         WHERE customer_id IS NOT NULL 
         AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')"
    )
    .fetch_one(pool)
    .await?;

    Ok(DashboardStats {
        sales_today: sales_today.0.unwrap_or(0.0),
        sales_month: sales_month.0.unwrap_or(0.0),
        critical_stock,
        top_products,
        active_customers: active_customers.0,
    })
}

