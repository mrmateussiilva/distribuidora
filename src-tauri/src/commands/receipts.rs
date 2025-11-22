use crate::auth::AuthState;
use crate::db::{orders, DbPool};
use crate::errors::Result;
use crate::guards;
use tauri::State;

#[tauri::command]
pub async fn generate_receipt(
    order_id: i64,
    pool: State<'_, DbPool>,
    auth_state: State<'_, AuthState>,
) -> Result<String> {
    let _user = guards::get_authenticated_user(&auth_state)?;
    let order = orders::get_order_by_id(pool.inner(), order_id).await?;

    // Gera HTML do recibo
    let html = format!(
        r#"
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Recibo #{}</title>
    <style>
        body {{
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }}
        .header {{
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 20px;
        }}
        .info {{
            margin-bottom: 20px;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }}
        th, td {{
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }}
        th {{
            background-color: #f2f2f2;
        }}
        .total {{
            text-align: right;
            font-size: 1.2em;
            font-weight: bold;
            margin-top: 20px;
        }}
        .footer {{
            margin-top: 40px;
            text-align: center;
            font-size: 0.9em;
            color: #666;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>RECIBO DE VENDA</h1>
        <p>Pedido #{}</p>
    </div>
    
    <div class="info">
        <p><strong>Cliente:</strong> {}</p>
        <p><strong>Data:</strong> {}</p>
    </div>
    
    <table>
        <thead>
            <tr>
                <th>Produto</th>
                <th>Qtd</th>
                <th>Preço Unit.</th>
                <th>Subtotal</th>
            </tr>
        </thead>
        <tbody>
            {}
        </tbody>
    </table>
    
    <div class="total">
        <p>TOTAL: R$ {:.2}</p>
    </div>
    
    <div class="footer">
        <p>Obrigado pela preferência!</p>
    </div>
</body>
</html>
        "#,
        order_id,
        order_id,
        order.order.customer_name.as_deref().unwrap_or("Consumidor Final"),
        order.order.created_at,
        order.items.iter().map(|item| {
            format!(
                "<tr><td>{} {}</td><td>{}</td><td>R$ {:.2}</td><td>R$ {:.2}</td></tr>",
                item.product_name,
                if item.returned_bottle { "(com casco)" } else { "" },
                item.quantity,
                item.unit_price,
                item.quantity as f64 * item.unit_price
            )
        }).collect::<Vec<_>>().join(""),
        order.order.total
    );

    Ok(html)
}

