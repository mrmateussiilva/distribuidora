use crate::models::{Product, CreateProductPayload, UpdateProductPayload};
use crate::errors::AppError;
use sqlx::SqlitePool;

pub async fn get_all_products(pool: &SqlitePool) -> Result<Vec<Product>, AppError> {
    let products = sqlx::query_as::<_, Product>(
        "SELECT * FROM products ORDER BY name"
    )
    .fetch_all(pool)
    .await?;
    
    Ok(products)
}

pub async fn get_product_by_id(pool: &SqlitePool, id: i64) -> Result<Product, AppError> {
    let product = sqlx::query_as::<_, Product>(
        "SELECT * FROM products WHERE id = ?"
    )
    .bind(id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Product with id {} not found", id)))?;
    
    Ok(product)
}

pub async fn create_product(
    pool: &SqlitePool,
    payload: CreateProductPayload,
) -> Result<i64, AppError> {
    // Validação
    if payload.name.is_empty() {
        return Err(AppError::Validation("Product name cannot be empty".to_string()));
    }
    
    if !["water", "gas", "coal", "other"].contains(&payload.r#type.as_str()) {
        return Err(AppError::Validation("Invalid product type".to_string()));
    }
    
    if payload.price_refill < 0.0 || payload.price_full < 0.0 {
        return Err(AppError::Validation("Prices cannot be negative".to_string()));
    }

    let id = sqlx::query(
        "INSERT INTO products (name, description, type, price_refill, price_full, stock_full, stock_empty, expiry_month, expiry_year)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&payload.name)
    .bind(&payload.description)
    .bind(&payload.r#type)
    .bind(payload.price_refill)
    .bind(payload.price_full)
    .bind(payload.stock_full.unwrap_or(0))
    .bind(payload.stock_empty.unwrap_or(0))
    .bind(&payload.expiry_month)
    .bind(&payload.expiry_year)
    .execute(pool)
    .await?
    .last_insert_rowid();

    Ok(id)
}

pub async fn update_product(
    pool: &SqlitePool,
    id: i64,
    payload: UpdateProductPayload,
) -> Result<(), AppError> {
    // Verifica se existe
    get_product_by_id(pool, id).await?;

    // Validações
    if let Some(ref name) = payload.name {
        if name.is_empty() {
            return Err(AppError::Validation("Product name cannot be empty".to_string()));
        }
    }

    if let Some(ref r#type) = payload.r#type {
        if !["water", "gas", "coal", "other"].contains(&r#type.as_str()) {
            return Err(AppError::Validation("Invalid product type".to_string()));
        }
    }

    if let Some(price_refill) = payload.price_refill {
        if price_refill < 0.0 {
            return Err(AppError::Validation("Price cannot be negative".to_string()));
        }
    }

    if let Some(price_full) = payload.price_full {
        if price_full < 0.0 {
            return Err(AppError::Validation("Price cannot be negative".to_string()));
        }
    }

    // Constrói query dinamicamente usando QueryBuilder
    let mut query_builder = sqlx::QueryBuilder::new("UPDATE products SET ");
    let mut has_updates = false;

    if let Some(name) = &payload.name {
        if has_updates {
            query_builder.push(", ");
        }
        query_builder.push("name = ");
        query_builder.push_bind(name);
        has_updates = true;
    }

    if payload.description.is_some() {
        if has_updates {
            query_builder.push(", ");
        }
        query_builder.push("description = ");
        query_builder.push_bind(&payload.description);
        has_updates = true;
    }

    if let Some(r#type) = &payload.r#type {
        if has_updates {
            query_builder.push(", ");
        }
        query_builder.push("type = ");
        query_builder.push_bind(r#type);
        has_updates = true;
    }

    if let Some(price_refill) = payload.price_refill {
        if has_updates {
            query_builder.push(", ");
        }
        query_builder.push("price_refill = ");
        query_builder.push_bind(price_refill);
        has_updates = true;
    }

    if let Some(price_full) = payload.price_full {
        if has_updates {
            query_builder.push(", ");
        }
        query_builder.push("price_full = ");
        query_builder.push_bind(price_full);
        has_updates = true;
    }

    if let Some(stock_full) = payload.stock_full {
        if has_updates {
            query_builder.push(", ");
        }
        query_builder.push("stock_full = ");
        query_builder.push_bind(stock_full);
        has_updates = true;
    }

    if let Some(stock_empty) = payload.stock_empty {
        if has_updates {
            query_builder.push(", ");
        }
        query_builder.push("stock_empty = ");
        query_builder.push_bind(stock_empty);
        has_updates = true;
    }

    if payload.expiry_month.is_some() {
        if has_updates {
            query_builder.push(", ");
        }
        query_builder.push("expiry_month = ");
        query_builder.push_bind(&payload.expiry_month);
        has_updates = true;
    }

    if payload.expiry_year.is_some() {
        if has_updates {
            query_builder.push(", ");
        }
        query_builder.push("expiry_year = ");
        query_builder.push_bind(&payload.expiry_year);
        has_updates = true;
    }

    if !has_updates {
        return Ok(()); // Nada para atualizar
    }

    query_builder.push(" WHERE id = ");
    query_builder.push_bind(id);

    query_builder.build().execute(pool).await?;

    Ok(())
}

pub async fn delete_product(pool: &SqlitePool, id: i64) -> Result<(), AppError> {
    // Verifica se existe
    get_product_by_id(pool, id).await?;

    sqlx::query("DELETE FROM products WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_helpers::test_helpers::{setup_test_db, cleanup_test_db};

    #[tokio::test]
    async fn test_create_product() {
        let pool = setup_test_db().await;
        cleanup_test_db(&pool).await;

        let payload = CreateProductPayload {
            name: "Água 20L".to_string(),
            description: Some("Água mineral".to_string()),
            r#type: "water".to_string(),
            price_refill: 5.0,
            price_full: 10.0,
            stock_full: Some(100),
            stock_empty: Some(0),
        };

        let id = create_product(&pool, payload).await.unwrap();
        assert!(id > 0);

        let product = get_product_by_id(&pool, id).await.unwrap();
        assert_eq!(product.name, "Água 20L");
        assert_eq!(product.price_refill, 5.0);
        assert_eq!(product.price_full, 10.0);
        assert_eq!(product.stock_full, 100);
    }

    #[tokio::test]
    async fn test_create_product_validation() {
        let pool = setup_test_db().await;
        cleanup_test_db(&pool).await;

        // Nome vazio
        let payload = CreateProductPayload {
            name: "".to_string(),
            description: None,
            r#type: "water".to_string(),
            price_refill: 5.0,
            price_full: 10.0,
            stock_full: None,
            stock_empty: None,
        };
        assert!(create_product(&pool, payload).await.is_err());

        // Tipo inválido
        let payload = CreateProductPayload {
            name: "Produto".to_string(),
            description: None,
            r#type: "invalid".to_string(),
            price_refill: 5.0,
            price_full: 10.0,
            stock_full: None,
            stock_empty: None,
        };
        assert!(create_product(&pool, payload).await.is_err());

        // Preço negativo
        let payload = CreateProductPayload {
            name: "Produto".to_string(),
            description: None,
            r#type: "water".to_string(),
            price_refill: -5.0,
            price_full: 10.0,
            stock_full: None,
            stock_empty: None,
        };
        assert!(create_product(&pool, payload).await.is_err());
    }

    #[tokio::test]
    async fn test_get_all_products() {
        let pool = setup_test_db().await;
        cleanup_test_db(&pool).await;

        // Cria alguns produtos
        let payload1 = CreateProductPayload {
            name: "Água 20L".to_string(),
            description: None,
            r#type: "water".to_string(),
            price_refill: 5.0,
            price_full: 10.0,
            stock_full: None,
            stock_empty: None,
        };
        create_product(&pool, payload1).await.unwrap();

        let payload2 = CreateProductPayload {
            name: "Gás 13kg".to_string(),
            description: None,
            r#type: "gas".to_string(),
            price_refill: 45.0,
            price_full: 80.0,
            stock_full: None,
            stock_empty: None,
        };
        create_product(&pool, payload2).await.unwrap();

        let products = get_all_products(&pool).await.unwrap();
        assert_eq!(products.len(), 2);
        assert!(products.iter().any(|p| p.name == "Água 20L"));
        assert!(products.iter().any(|p| p.name == "Gás 13kg"));
    }

    #[tokio::test]
    async fn test_get_product_by_id() {
        let pool = setup_test_db().await;
        cleanup_test_db(&pool).await;

        let payload = CreateProductPayload {
            name: "Água 20L".to_string(),
            description: Some("Teste".to_string()),
            r#type: "water".to_string(),
            price_refill: 5.0,
            price_full: 10.0,
            stock_full: None,
            stock_empty: None,
        };

        let id = create_product(&pool, payload).await.unwrap();
        let product = get_product_by_id(&pool, id).await.unwrap();

        assert_eq!(product.name, "Água 20L");
        assert_eq!(product.description, Some("Teste".to_string()));

        // Produto inexistente
        assert!(get_product_by_id(&pool, 99999).await.is_err());
    }

    #[tokio::test]
    async fn test_update_product() {
        let pool = setup_test_db().await;
        cleanup_test_db(&pool).await;

        let payload = CreateProductPayload {
            name: "Água 20L".to_string(),
            description: None,
            r#type: "water".to_string(),
            price_refill: 5.0,
            price_full: 10.0,
            stock_full: None,
            stock_empty: None,
        };

        let id = create_product(&pool, payload).await.unwrap();

        let update_payload = UpdateProductPayload {
            name: Some("Água 20L Premium".to_string()),
            description: Some("Água premium".to_string()),
            r#type: None,
            price_refill: Some(6.0),
            price_full: None,
            stock_full: Some(150),
            stock_empty: None,
        };

        update_product(&pool, id, update_payload).await.unwrap();

        let product = get_product_by_id(&pool, id).await.unwrap();
        assert_eq!(product.name, "Água 20L Premium");
        assert_eq!(product.description, Some("Água premium".to_string()));
        assert_eq!(product.price_refill, 6.0);
        assert_eq!(product.price_full, 10.0); // Não foi alterado
        assert_eq!(product.stock_full, 150);
    }

    #[tokio::test]
    async fn test_update_product_validation() {
        let pool = setup_test_db().await;
        cleanup_test_db(&pool).await;

        let payload = CreateProductPayload {
            name: "Água 20L".to_string(),
            description: None,
            r#type: "water".to_string(),
            price_refill: 5.0,
            price_full: 10.0,
            stock_full: None,
            stock_empty: None,
        };

        let id = create_product(&pool, payload).await.unwrap();

        // Nome vazio
        let update_payload = UpdateProductPayload {
            name: Some("".to_string()),
            description: None,
            r#type: None,
            price_refill: None,
            price_full: None,
            stock_full: None,
            stock_empty: None,
        };
        assert!(update_product(&pool, id, update_payload).await.is_err());

        // Tipo inválido
        let update_payload = UpdateProductPayload {
            name: None,
            description: None,
            r#type: Some("invalid".to_string()),
            price_refill: None,
            price_full: None,
            stock_full: None,
            stock_empty: None,
        };
        assert!(update_product(&pool, id, update_payload).await.is_err());

        // Preço negativo
        let update_payload = UpdateProductPayload {
            name: None,
            description: None,
            r#type: None,
            price_refill: Some(-5.0),
            price_full: None,
            stock_full: None,
            stock_empty: None,
        };
        assert!(update_product(&pool, id, update_payload).await.is_err());
    }

    #[tokio::test]
    async fn test_delete_product() {
        let pool = setup_test_db().await;
        cleanup_test_db(&pool).await;

        let payload = CreateProductPayload {
            name: "Água 20L".to_string(),
            description: None,
            r#type: "water".to_string(),
            price_refill: 5.0,
            price_full: 10.0,
            stock_full: None,
            stock_empty: None,
        };

        let id = create_product(&pool, payload).await.unwrap();
        assert!(get_product_by_id(&pool, id).await.is_ok());

        delete_product(&pool, id).await.unwrap();
        assert!(get_product_by_id(&pool, id).await.is_err());

        // Tentar deletar produto inexistente
        assert!(delete_product(&pool, 99999).await.is_err());
    }
}
