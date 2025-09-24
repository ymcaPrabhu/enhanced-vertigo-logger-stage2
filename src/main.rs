mod models;
mod schema;
mod database;
mod handlers;
mod ai_service;
mod pdf_generator;
mod init;

use axum::{
    http::Method,
    routing::{get, post, put, delete},
    Router,
};
use std::sync::{Arc, Mutex};
use tower::ServiceBuilder;
use tower_http::{
    cors::{Any, CorsLayer},
    services::ServeDir,
};

use handlers::AppState;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🚀 Starting Enhanced Vertigo Logger Stage 2...");

    let conn = init::ensure_database_setup()
        .expect("Failed to initialize database");

    println!("✅ Database connected successfully");

    let app_state: AppState = Arc::new(Mutex::new(conn));

    let cors = CorsLayer::new()
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
        .allow_origin(Any)
        .allow_headers(Any);

    let api_routes = Router::new()
        .route("/health", get(handlers::health_check))
        .route("/api/episodes", get(handlers::get_episodes))
        .route("/api/episodes", post(handlers::create_episode))
        .route("/api/episodes/:id", get(handlers::get_episode))
        .route("/api/episodes/:id", put(handlers::update_episode))
        .route("/api/episodes/:id", delete(handlers::delete_episode))
        .route("/api/analyze", post(handlers::analyze_episode))
        .route("/api/export", get(handlers::export_episodes))
        .route("/api/analytics", get(handlers::get_analytics))
        .route("/api/patterns", get(handlers::get_patterns))
        .route("/api/report/pdf", get(handlers::generate_pdf_report))
        .with_state(app_state);

    let static_files = ServeDir::new("static").fallback(
        ServeDir::new("static").not_found_service(ServeDir::new("static/index.html"))
    );

    let app = Router::new()
        .merge(api_routes)
        .nest_service("/", static_files)
        .layer(ServiceBuilder::new().layer(cors));

    // Use PORT environment variable if available (for Railway/Heroku)
    let port = std::env::var("PORT").unwrap_or_else(|_| "3000".to_string());
    let bind_address = format!("0.0.0.0:{}", port);

    let listener = tokio::net::TcpListener::bind(&bind_address)
        .await
        .expect(&format!("Failed to bind to {}", bind_address));

    println!("🌐 Server running on {}", bind_address);
    println!("📱 Web interface available at http://0.0.0.0:{}", port);
    println!("🔌 API endpoints available at http://0.0.0.0:{}/api/*", port);
    println!("🏥 Enhanced Vertigo Logger Stage 2 - Production Ready!");

    axum::serve(listener, app)
        .await
        .expect("Server failed to start");

    Ok(())
}