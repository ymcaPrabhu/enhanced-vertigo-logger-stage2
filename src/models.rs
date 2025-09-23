use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use chrono::NaiveDateTime;

#[derive(Queryable, Serialize, Debug)]
#[diesel(table_name = crate::schema::episodes)]
pub struct Episode {
    pub id: i32,
    pub timestamp: NaiveDateTime,
    pub duration_minutes: Option<i32>,
    pub severity: i32,
    pub triggers: Option<String>,
    pub symptoms: Option<String>,
    pub location: Option<String>,
    pub activities_before: Option<String>,
    pub medications_taken: Option<String>,
    pub notes: Option<String>,
    pub ai_analysis: Option<String>,
    pub created_at: NaiveDateTime,
}

#[derive(Insertable, Deserialize, Debug)]
#[diesel(table_name = crate::schema::episodes)]
pub struct NewEpisode {
    pub timestamp: Option<NaiveDateTime>,
    pub duration_minutes: Option<i32>,
    pub severity: i32,
    pub triggers: Option<String>,
    pub symptoms: Option<String>,
    pub location: Option<String>,
    pub activities_before: Option<String>,
    pub medications_taken: Option<String>,
    pub notes: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct AnalysisRequest {
    pub symptoms: String,
    pub triggers: Option<String>,
    pub severity: Option<i32>,
}

#[derive(Serialize, Debug)]
pub struct AnalysisResponse {
    pub analysis: String,
    pub recommendations: Vec<String>,
    pub confidence: f32,
}

#[derive(Deserialize, Debug)]
pub struct EpisodeUpdate {
    pub duration_minutes: Option<i32>,
    pub severity: Option<i32>,
    pub triggers: Option<String>,
    pub symptoms: Option<String>,
    pub location: Option<String>,
    pub activities_before: Option<String>,
    pub medications_taken: Option<String>,
    pub notes: Option<String>,
    pub ai_analysis: Option<String>,
}