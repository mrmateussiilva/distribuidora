use crate::models::{
    OrderWithCustomer, OrderItemPayload, CreateOrderPayload,
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_helpers::test_helpers::{setup_test_db, cleanup_test_db};
    use crate::db::products;
    use crate::db::customers;
    use crate::models::{CreateProductPayload, CreateCustomerPayload};

    async fn create_test_product(pool: &SqlitePool) -> i64 {
        let payload = CreateProductPayload {
            name: "Água 20L".to_string(),
            description: None,
            r#type: "water".to_string(),
            price_refill: 5.0,
            price_full: 10.0,
            stock_full: Some(100),
            stock_empty: Some(0),
        };
        products::create_product(pool, payload).await.unwrap()
    }

    async fn create_test_customer(pool: &SqlitePool) -> i64 {
        let payload = CreateCustomerPayload {
            name: "João Silva".to_string(),
            phone: None,
            address: None,
            notes: None,
        };
        customers::create_customer(pool, payload).await.unwrap()
    }

    #[tokio::test]
    async fn test_create_order() {
        let pool = setup_test_db().await;
        cleanup_test_db(&pool).await;

        let product_id = create_test_product(&pool).await;
        let customer_id = create_test_customer(&pool).await;

        let payload = CreateOrderPayload {
            customer_id: Some(customer_id),
            items: vec![
                OrderItemPayload {
                    product_id,
                    quantity: 2,
                    returned_bottle: false,
                    unit_price: 10.0,
                },
            ],
        };

        let order_id = create_order(&pool, payload).await.unwrap();
        assert!(order_id > 0);

        let order = get_order_by_id(&pool, order_id).await.unwrap();
        assert_eq!(order.order.total, 20.0);
        assert_eq!(order.items.len(), 1);
        assert_eq!(order.items[0].quantity, 2);

        // Verifica que o estoque foi atualizado
        let product = products::get_product_by_id(&pool, product_id).await.unwrap();
        assert_eq!(product.stock_full, 98); // 100 - 2
    }

    #[tokio::test]
    async fn test_create_order_with_returned_bottle() {
        let pool = setup_test_db().await;
        cleanup_test_db(&pool).await;

        let product_id = create_test_product(&pool).await;

        let payload = CreateOrderPayload {
            customer_id: None,
            items: vec![
                OrderItemPayload {
                    product_id,
                    quantity: 1,
                    returned_bottle: true,
                    unit_price: 5.0,
                },
            ],
        };

        create_order(&pool, payload).await.unwrap();

        // Verifica que o estoque foi atualizado corretamente
        let product = products::get_product_by_id(&pool, product_id).await.unwrap();
        assert_eq!(product.stock_full, 99); // 100 - 1
        assert_eq!(product.stock_empty, 1); // 0 + 1 (casco retornado)
    }

    #[tokio::test]
    async fn test_create_order_validation() {
        let pool = setup_test_db().await;
        cleanup_test_db(&pool).await;

        // Pedido sem itens
        let payload = CreateOrderPayload {
            customer_id: None,
            items: vec![],
        };
        assert!(create_order(&pool, payload).await.is_err());

        // Produto inexistente
        let payload = CreateOrderPayload {
            customer_id: None,
            items: vec![
                OrderItemPayload {
                    product_id: 99999,
                    quantity: 1,
                    returned_bottle: false,
                    unit_price: 10.0,
                },
            ],
        };
        assert!(create_order(&pool, payload).await.is_err());
    }

    #[tokio::test]
    async fn test_create_order_insufficient_stock() {
        let pool = setup_test_db().await;
        cleanup_test_db(&pool).await;

        let product_id = create_test_product(&pool).await;

        let payload = CreateOrderPayload {
            customer_id: None,
            items: vec![
                OrderItemPayload {
                    product_id,
                    quantity: 101, // Mais que o estoque disponível (100)
                    returned_bottle: false,
                    unit_price: 10.0,
                },
            ],
        };

        assert!(create_order(&pool, payload).await.is_err());
    }

    #[tokio::test]
    async fn test_get_all_orders() {
        let pool = setup_test_db().await;
        cleanup_test_db(&pool).await;

        let product_id = create_test_product(&pool).await;

        let payload1 = CreateOrderPayload {
            customer_id: None,
            items: vec![
                OrderItemPayload {
                    product_id,
                    quantity: 1,
                    returned_bottle: false,
                    unit_price: 10.0,
                },
            ],
        };
        create_order(&pool, payload1).await.unwrap();

        let payload2 = CreateOrderPayload {
            customer_id: None,
            items: vec![
                OrderItemPayload {
                    product_id,
                    quantity: 2,
                    returned_bottle: false,
                    unit_price: 10.0,
                },
            ],
        };
        create_order(&pool, payload2).await.unwrap();

        let orders = get_all_orders(&pool).await.unwrap();
        assert_eq!(orders.len(), 2);
    }

    #[tokio::test]
    async fn test_get_orders_by_customer() {
        let pool = setup_test_db().await;
        cleanup_test_db(&pool).await;

        let product_id = create_test_product(&pool).await;
        let customer_id = create_test_customer(&pool).await;

        let payload1 = CreateOrderPayload {
            customer_id: Some(customer_id),
            items: vec![
                OrderItemPayload {
                    product_id,
                    quantity: 1,
                    returned_bottle: false,
                    unit_price: 10.0,
                },
            ],
        };
        create_order(&pool, payload1).await.unwrap();

        let payload2 = CreateOrderPayload {
            customer_id: None,
            items: vec![
                OrderItemPayload {
                    product_id,
                    quantity: 1,
                    returned_bottle: false,
                    unit_price: 10.0,
                },
            ],
        };
        create_order(&pool, payload2).await.unwrap();

        let orders = get_orders_by_customer(&pool, customer_id).await.unwrap();
        assert_eq!(orders.len(), 1);
    }
}

