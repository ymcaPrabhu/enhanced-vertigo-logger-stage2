mod models;
mod schema;
mod database;
mod handlers;
mod ai_service;

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
    println!("🚀 Starting Vertigo Logger Stage 1 MVP...");

    let conn = database::establish_connection()
        .expect("Failed to connect to database");

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
        .with_state(app_state);

    let static_files = ServeDir::new("static").fallback(
        ServeDir::new("static").not_found_service(ServeDir::new("static/index.html"))
    );

    let app = Router::new()
        .merge(api_routes)
        .nest_service("/", static_files)
        .layer(ServiceBuilder::new().layer(cors));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000")
        .await
        .expect("Failed to bind to port 3000");

    println!("🌐 Server running on http://localhost:3000");
    println!("📱 Web interface available at http://localhost:3000");
    println!("🔌 API endpoints available at http://localhost:3000/api/*");

    axum::serve(listener, app)
        .await
        .expect("Server failed to start");

    Ok(())
}