use crate::models::{
    Order, OrderWithCustomer, OrderItem, OrderItemPayload, CreateOrderPayload,
    OrderWithItems, OrderItemWithProduct,
};
use crate::errors::AppError;
use sqlx::SqlitePool;

pub async fn create_order(
    pool: &SqlitePool,
    payload: CreateOrderPayload,
) -> Result<i64, AppError> {
    if payload.items.is_empty() {
        return Err(AppError::Validation("Order must have at least one item".to_string()));
    }

    // Inicia transação
    let mut tx = pool.begin().await?;

    // Calcula total
    let total: f64 = payload.items.iter()
        .map(|item| item.unit_price * item.quantity as f64)
        .sum();

    // Insere pedido
    let order_id = sqlx::query(
        "INSERT INTO orders (customer_id, total) VALUES (?, ?)"
    )
    .bind(payload.customer_id)
    .bind(total)
    .execute(&mut *tx)
    .await?
    .last_insert_rowid();

    // Insere itens e atualiza estoque
    for item in &payload.items {
        // Valida estoque
        let product: (i64, i64) = sqlx::query_as(
            "SELECT stock_full, stock_empty FROM products WHERE id = ?"
        )
        .bind(item.product_id)
        .fetch_optional(&mut *tx)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Product {} not found", item.product_id)))?;

        if product.0 < item.quantity {
            return Err(AppError::BusinessLogic(
                format!("Insufficient stock for product {}. Available: {}, Requested: {}", 
                    item.product_id, product.0, item.quantity)
            ));
        }

        // Insere item do pedido
        sqlx::query(
            "INSERT INTO order_items (order_id, product_id, quantity, returned_bottle, unit_price)
             VALUES (?, ?, ?, ?, ?)"
        )
        .bind(order_id)
        .bind(item.product_id)
        .bind(item.quantity)
        .bind(item.returned_bottle)
        .bind(item.unit_price)
        .execute(&mut *tx)
        .await?;

        // Atualiza estoque: sempre diminui stock_full
        sqlx::query("UPDATE products SET stock_full = stock_full - ? WHERE id = ?")
            .bind(item.quantity)
            .bind(item.product_id)
            .execute(&mut *tx)
            .await?;

        // Se trouxe o casco, aumenta stock_empty
        if item.returned_bottle {
            sqlx::query("UPDATE products SET stock_empty = stock_empty + ? WHERE id = ?")
                .bind(item.quantity)
                .bind(item.product_id)
                .execute(&mut *tx)
                .await?;
        }

        // Registra movimentação de estoque
        sqlx::query(
            "INSERT INTO stock_movements (product_id, movement_type, quantity)
             VALUES (?, 'OUT', ?)"
        )
        .bind(item.product_id)
        .bind(item.quantity)
        .execute(&mut *tx)
        .await?;
    }

    // Commit transação
    tx.commit().await?;

    Ok(order_id)
}

pub async fn get_all_orders(pool: &SqlitePool) -> Result<Vec<OrderWithCustomer>, AppError> {
    let orders = sqlx::query_as::<_, OrderWithCustomer>(
        "SELECT o.id, o.customer_id, c.name as customer_name, o.total, o.created_at
         FROM orders o
         LEFT JOIN customers c ON o.customer_id = c.id
         ORDER BY o.created_at DESC"
    )
    .fetch_all(pool)
    .await?;
    
    Ok(orders)
}

pub async fn get_order_by_id(pool: &SqlitePool, id: i64) -> Result<OrderWithItems, AppError> {
    // Busca pedido
    let order = sqlx::query_as::<_, OrderWithCustomer>(
        "SELECT o.id, o.customer_id, c.name as customer_name, o.total, o.created_at
         FROM orders o
         LEFT JOIN customers c ON o.customer_id = c.id
         WHERE o.id = ?"
    )
    .bind(id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Order with id {} not found", id)))?;

    // Busca itens
    let items = sqlx::query_as::<_, OrderItemWithProduct>(
        "SELECT oi.id, oi.order_id, oi.product_id, p.name as product_name,
                oi.quantity, oi.returned_bottle, oi.unit_price
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?"
    )
    .bind(id)
    .fetch_all(pool)
    .await?;

    Ok(OrderWithItems { order, items })
}

pub async fn get_orders_by_customer(pool: &SqlitePool, customer_id: i64) -> Result<Vec<OrderWithCustomer>, AppError> {
    let orders = sqlx::query_as::<_, OrderWithCustomer>(
        "SELECT o.id, o.customer_id, c.name as customer_name, o.total, o.created_at
         FROM orders o
         LEFT JOIN customers c ON o.customer_id = c.id
         WHERE o.customer_id = ?
         ORDER BY o.created_at DESC"
    )
    .bind(customer_id)
    .fetch_all(pool)
    .await?;
    
    Ok(orders)
}

