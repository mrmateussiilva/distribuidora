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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_helpers::test_helpers::{setup_test_db, cleanup_test_db};

    #[tokio::test]
    async fn test_create_customer() {
        let pool = setup_test_db().await;
        cleanup_test_db(&pool).await;

        let payload = CreateCustomerPayload {
            name: "João Silva".to_string(),
            phone: Some("11999999999".to_string()),
            address: Some("Rua Teste, 123".to_string()),
            notes: Some("Cliente preferencial".to_string()),
        };

        let id = create_customer(&pool, payload).await.unwrap();
        assert!(id > 0);

        let customer = get_customer_by_id(&pool, id).await.unwrap();
        assert_eq!(customer.name, "João Silva");
        assert_eq!(customer.phone, Some("11999999999".to_string()));
    }

    #[tokio::test]
    async fn test_create_customer_validation() {
        let pool = setup_test_db().await;
        cleanup_test_db(&pool).await;

        // Nome vazio
        let payload = CreateCustomerPayload {
            name: "".to_string(),
            phone: None,
            address: None,
            notes: None,
        };
        assert!(create_customer(&pool, payload).await.is_err());
    }

    #[tokio::test]
    async fn test_get_all_customers() {
        let pool = setup_test_db().await;
        cleanup_test_db(&pool).await;

        let payload1 = CreateCustomerPayload {
            name: "João Silva".to_string(),
            phone: None,
            address: None,
            notes: None,
        };
        create_customer(&pool, payload1).await.unwrap();

        let payload2 = CreateCustomerPayload {
            name: "Maria Santos".to_string(),
            phone: None,
            address: None,
            notes: None,
        };
        create_customer(&pool, payload2).await.unwrap();

        let customers = get_all_customers(&pool).await.unwrap();
        assert_eq!(customers.len(), 2);
    }

    #[tokio::test]
    async fn test_search_customers_by_phone() {
        let pool = setup_test_db().await;
        cleanup_test_db(&pool).await;

        let payload1 = CreateCustomerPayload {
            name: "João Silva".to_string(),
            phone: Some("11999999999".to_string()),
            address: None,
            notes: None,
        };
        create_customer(&pool, payload1).await.unwrap();

        let payload2 = CreateCustomerPayload {
            name: "Maria Santos".to_string(),
            phone: Some("11888888888".to_string()),
            address: None,
            notes: None,
        };
        create_customer(&pool, payload2).await.unwrap();

        let customers = search_customers_by_phone(&pool, "9999").await.unwrap();
        assert_eq!(customers.len(), 1);
        assert_eq!(customers[0].name, "João Silva");
    }

    #[tokio::test]
    async fn test_update_customer() {
        let pool = setup_test_db().await;
        cleanup_test_db(&pool).await;

        let payload = CreateCustomerPayload {
            name: "João Silva".to_string(),
            phone: Some("11999999999".to_string()),
            address: None,
            notes: None,
        };

        let id = create_customer(&pool, payload).await.unwrap();

        let update_payload = UpdateCustomerPayload {
            name: Some("João Silva Santos".to_string()),
            phone: Some("11777777777".to_string()),
            address: Some("Nova Rua".to_string()),
            notes: None,
        };

        update_customer(&pool, id, update_payload).await.unwrap();

        let customer = get_customer_by_id(&pool, id).await.unwrap();
        assert_eq!(customer.name, "João Silva Santos");
        assert_eq!(customer.phone, Some("11777777777".to_string()));
        assert_eq!(customer.address, Some("Nova Rua".to_string()));
    }

    #[tokio::test]
    async fn test_update_customer_validation() {
        let pool = setup_test_db().await;
        cleanup_test_db(&pool).await;

        let payload = CreateCustomerPayload {
            name: "João Silva".to_string(),
            phone: None,
            address: None,
            notes: None,
        };

        let id = create_customer(&pool, payload).await.unwrap();

        // Nome vazio
        let update_payload = UpdateCustomerPayload {
            name: Some("".to_string()),
            phone: None,
            address: None,
            notes: None,
        };
        assert!(update_customer(&pool, id, update_payload).await.is_err());
    }

    #[tokio::test]
    async fn test_delete_customer() {
        let pool = setup_test_db().await;
        cleanup_test_db(&pool).await;

        let payload = CreateCustomerPayload {
            name: "João Silva".to_string(),
            phone: None,
            address: None,
            notes: None,
        };

        let id = create_customer(&pool, payload).await.unwrap();
        assert!(get_customer_by_id(&pool, id).await.is_ok());

        delete_customer(&pool, id).await.unwrap();
        assert!(get_customer_by_id(&pool, id).await.is_err());
    }
}

