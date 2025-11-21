use crate::models::{Customer, CreateCustomerPayload, UpdateCustomerPayload};
use crate::errors::AppError;
use sqlx::SqlitePool;

pub async fn get_all_customers(pool: &SqlitePool) -> Result<Vec<Customer>, AppError> {
    let customers = sqlx::query_as::<_, Customer>(
        "SELECT * FROM customers ORDER BY name"
    )
    .fetch_all(pool)
    .await?;
    
    Ok(customers)
}

pub async fn get_customer_by_id(pool: &SqlitePool, id: i64) -> Result<Customer, AppError> {
    let customer = sqlx::query_as::<_, Customer>(
        "SELECT * FROM customers WHERE id = ?"
    )
    .bind(id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Customer with id {} not found", id)))?;
    
    Ok(customer)
}

pub async fn search_customers_by_phone(pool: &SqlitePool, phone: &str) -> Result<Vec<Customer>, AppError> {
    let customers = sqlx::query_as::<_, Customer>(
        "SELECT * FROM customers WHERE phone LIKE ? ORDER BY name"
    )
    .bind(format!("%{}%", phone))
    .fetch_all(pool)
    .await?;
    
    Ok(customers)
}

pub async fn create_customer(
    pool: &SqlitePool,
    payload: CreateCustomerPayload,
) -> Result<i64, AppError> {
    if payload.name.is_empty() {
        return Err(AppError::Validation("Customer name cannot be empty".to_string()));
    }

    let id = sqlx::query(
        "INSERT INTO customers (name, phone, address, notes)
         VALUES (?, ?, ?, ?)"
    )
    .bind(&payload.name)
    .bind(&payload.phone)
    .bind(&payload.address)
    .bind(&payload.notes)
    .execute(pool)
    .await?
    .last_insert_rowid();

    Ok(id)
}

pub async fn update_customer(
    pool: &SqlitePool,
    id: i64,
    payload: UpdateCustomerPayload,
) -> Result<(), AppError> {
    // Verifica se existe
    get_customer_by_id(pool, id).await?;

    // Constrói query dinamicamente
    let mut query = sqlx::QueryBuilder::new("UPDATE customers SET ");

    let mut has_updates = false;

    if let Some(name) = &payload.name {
        if name.is_empty() {
            return Err(AppError::Validation("Customer name cannot be empty".to_string()));
        }
        query.push("name = ");
        query.push_bind(name);
        has_updates = true;
    }

    if let Some(phone) = &payload.phone {
        if has_updates {
            query.push(", ");
        }
        query.push("phone = ");
        query.push_bind(phone);
        has_updates = true;
    }

    if let Some(address) = &payload.address {
        if has_updates {
            query.push(", ");
        }
        query.push("address = ");
        query.push_bind(address);
        has_updates = true;
    }

    if let Some(notes) = &payload.notes {
        if has_updates {
            query.push(", ");
        }
        query.push("notes = ");
        query.push_bind(notes);
        has_updates = true;
    }

    if !has_updates {
        return Ok(());
    }

    query.push(" WHERE id = ");
    query.push_bind(id);

    query.build().execute(pool).await?;

    Ok(())
}

pub async fn delete_customer(pool: &SqlitePool, id: i64) -> Result<(), AppError> {
    // Verifica se existe
    get_customer_by_id(pool, id).await?;

    sqlx::query("DELETE FROM customers WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await?;

    Ok(())
}

