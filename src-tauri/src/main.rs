// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;
mod models;
mod errors;
mod commands;
mod auth;
mod guards;

use db::{init_db, DbPool};
use tauri::Manager;

use commands::{
    // Products
    get_products, get_product, create_product, update_product, delete_product,
    // Customers
    get_customers, get_customer, search_customers_by_phone, create_customer, update_customer, delete_customer,
    // Orders
    create_order, get_orders, get_order, get_orders_by_customer,
    // Stock
    stock_in, stock_out, stock_adjust, get_stock_movements,
    // Dashboard
    get_dashboard_stats,
    // Receipts
    generate_receipt,
    // Users
    login, seed_admin_user, logout, get_current_user,
};

#[tokio::main]
async fn main() {
    let db_pool = init_db().await.expect("Failed to initialize database");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(db_pool)
        .manage(auth::AuthState::default())
        .setup(|app| {
            let pool = app.state::<DbPool>().inner().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = commands::users::_internal_seed_admin_user(&pool, "admin").await {
                    eprintln!("Failed to seed admin user: {}", e);
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Products
            get_products,
            get_product,
            create_product,
            update_product,
            delete_product,
            // Customers
            get_customers,
            get_customer,
            search_customers_by_phone,
            create_customer,
            update_customer,
            delete_customer,
            // Orders
            create_order,
            get_orders,
            get_order,
            get_orders_by_customer,
            // Stock
            stock_in,
            stock_out,
            stock_adjust,
            get_stock_movements,
            // Dashboard
            get_dashboard_stats,
            // Receipts
            generate_receipt,
            // Users
            login,
            seed_admin_user,
            logout,
            get_current_user,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
