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
        "INSERT INTO products (name, description, type, price_refill, price_full, stock_full, stock_empty)
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&payload.name)
    .bind(&payload.description)
    .bind(&payload.r#type)
    .bind(payload.price_refill)
    .bind(payload.price_full)
    .bind(payload.stock_full.unwrap_or(0))
    .bind(payload.stock_empty.unwrap_or(0))
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

