use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    Json as JsonExtractor,
};
use std::sync::{Arc, Mutex};

use crate::ai_service::AIService;
use crate::database::{self, DbConnection};
use crate::models::{Episode, NewEpisode, EpisodeUpdate, AnalysisRequest, AnalysisResponse, AnalyticsData, PatternAnalysis};
use crate::pdf_generator::PDFReportGenerator;

pub type AppState = Arc<Mutex<DbConnection>>;

pub async fn health_check() -> &'static str {
    "OK"
}

pub async fn create_episode(
    State(db): State<AppState>,
    JsonExtractor(new_episode): JsonExtractor<NewEpisode>,
) -> Result<Json<Episode>, StatusCode> {
    let mut conn = db.lock().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let episode = database::create_episode(&mut conn, &new_episode)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(episode))
}

pub async fn get_episodes(
    State(db): State<AppState>,
) -> Result<Json<Vec<Episode>>, StatusCode> {
    let mut conn = db.lock().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let episodes = database::get_all_episodes(&mut conn)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(episodes))
}

pub async fn get_episode(
    State(db): State<AppState>,
    Path(id): Path<i32>,
) -> Result<Json<Episode>, StatusCode> {
    let mut conn = db.lock().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let episode = database::get_episode_by_id(&mut conn, id)
        .map_err(|e| match e {
            diesel::result::Error::NotFound => StatusCode::NOT_FOUND,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        })?;

    Ok(Json(episode))
}

pub async fn update_episode(
    State(db): State<AppState>,
    Path(id): Path<i32>,
    JsonExtractor(episode_update): JsonExtractor<EpisodeUpdate>,
) -> Result<Json<Episode>, StatusCode> {
    let mut conn = db.lock().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let episode = database::update_episode(&mut conn, id, &episode_update)
        .map_err(|e| match e {
            diesel::result::Error::NotFound => StatusCode::NOT_FOUND,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        })?;

    Ok(Json(episode))
}

pub async fn delete_episode(
    State(db): State<AppState>,
    Path(id): Path<i32>,
) -> Result<StatusCode, StatusCode> {
    let mut conn = db.lock().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let rows_affected = database::delete_episode(&mut conn, id)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if rows_affected == 0 {
        Err(StatusCode::NOT_FOUND)
    } else {
        Ok(StatusCode::NO_CONTENT)
    }
}

pub async fn analyze_episode(
    JsonExtractor(analysis_request): JsonExtractor<AnalysisRequest>,
) -> Result<Json<AnalysisResponse>, StatusCode> {
    let ai_service = AIService::new()
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let analysis = ai_service.analyze_episode(&analysis_request)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(analysis))
}

pub async fn export_episodes(
    State(db): State<AppState>,
) -> Result<String, StatusCode> {
    let mut conn = db.lock().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let episodes = database::get_all_episodes(&mut conn)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut csv = String::from("ID,Timestamp,Duration (min),Severity,Symptoms,Triggers,Location,Activities Before,Medications,Notes,AI Analysis\n");

    for episode in episodes {
        csv.push_str(&format!(
            "{},{},{},{},{},{},{},{},{},{},{}\n",
            episode.id,
            episode.timestamp,
            episode.duration_minutes.map_or("".to_string(), |d| d.to_string()),
            episode.severity,
            episode.symptoms.as_deref().unwrap_or(""),
            episode.triggers.as_deref().unwrap_or(""),
            episode.location.as_deref().unwrap_or(""),
            episode.activities_before.as_deref().unwrap_or(""),
            episode.medications_taken.as_deref().unwrap_or(""),
            episode.notes.as_deref().unwrap_or(""),
            episode.ai_analysis.as_deref().unwrap_or(""),
        ));
    }

    Ok(csv)
}

pub async fn get_analytics(
    State(db): State<AppState>,
) -> Result<Json<AnalyticsData>, StatusCode> {
    let mut conn = db.lock().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let analytics = database::get_analytics_data(&mut conn)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(analytics))
}

pub async fn get_patterns(
    State(db): State<AppState>,
) -> Result<Json<PatternAnalysis>, StatusCode> {
    let mut conn = db.lock().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let episodes = database::get_all_episodes(&mut conn)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let ai_service = AIService::new()
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let patterns = ai_service.analyze_patterns(&episodes)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(patterns))
}

pub async fn generate_pdf_report(
    State(db): State<AppState>,
) -> Result<axum::response::Response, StatusCode> {
    let mut conn = db.lock().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let episodes = database::get_all_episodes(&mut conn)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let analytics = database::get_analytics_data(&mut conn)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let ai_service = AIService::new()
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let patterns = ai_service.analyze_patterns(&episodes)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let pdf_bytes = PDFReportGenerator::generate_medical_report(&episodes, &analytics, &patterns)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let filename = format!("vertigo-medical-report-{}.pdf",
        chrono::Utc::now().format("%Y-%m-%d"));

    Ok(axum::response::Response::builder()
        .header("Content-Type", "application/pdf")
        .header("Content-Disposition", format!("attachment; filename=\"{}\"", filename))
        .body(axum::body::Body::from(pdf_bytes))
        .unwrap())
}