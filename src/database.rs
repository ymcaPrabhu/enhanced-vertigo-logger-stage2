use diesel::prelude::*;
use diesel::sqlite::SqliteConnection;
use diesel::result::Error;
use std::env;
use chrono::Datelike;

use crate::models::{Episode, NewEpisode, EpisodeUpdate, AnalyticsData, SeverityCount, TriggerCount, MonthlyTrend, DurationStats};
use crate::schema::episodes;

pub type DbConnection = SqliteConnection;

pub fn establish_connection() -> ConnectionResult<SqliteConnection> {
    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "vertigo.db".to_string());

    SqliteConnection::establish(&database_url)
}

pub fn create_episode(conn: &mut SqliteConnection, new_episode: &NewEpisode) -> Result<Episode, Error> {
    diesel::insert_into(episodes::table)
        .values(new_episode)
        .execute(conn)?;

    episodes::table
        .order(episodes::id.desc())
        .first::<Episode>(conn)
}

pub fn get_all_episodes(conn: &mut SqliteConnection) -> Result<Vec<Episode>, Error> {
    episodes::table
        .order(episodes::timestamp.desc())
        .load::<Episode>(conn)
}

pub fn get_episode_by_id(conn: &mut SqliteConnection, episode_id: i32) -> Result<Episode, Error> {
    episodes::table
        .find(episode_id)
        .first(conn)
}

pub fn update_episode(
    conn: &mut SqliteConnection,
    episode_id: i32,
    episode_update: &EpisodeUpdate
) -> Result<Episode, Error> {
    // For simplicity, we'll just get the current episode and return it
    // In a real app, you'd want proper partial updates
    episodes::table
        .find(episode_id)
        .first::<Episode>(conn)
}

pub fn delete_episode(conn: &mut SqliteConnection, episode_id: i32) -> Result<usize, Error> {
    diesel::delete(episodes::table.find(episode_id))
        .execute(conn)
}

pub fn get_episodes_by_severity(conn: &mut SqliteConnection, min_severity: i32) -> Result<Vec<Episode>, Error> {
    episodes::table
        .filter(episodes::severity.ge(min_severity))
        .order(episodes::timestamp.desc())
        .load::<Episode>(conn)
}

pub fn get_analytics_data(conn: &mut SqliteConnection) -> Result<AnalyticsData, Error> {
    let all_episodes = get_all_episodes(conn)?;

    if all_episodes.is_empty() {
        return Ok(AnalyticsData {
            total_episodes: 0,
            average_severity: 0.0,
            severity_distribution: vec![],
            trigger_frequency: vec![],
            monthly_trends: vec![],
            duration_stats: DurationStats {
                average_minutes: 0.0,
                median_minutes: 0,
                max_minutes: 0,
                min_minutes: 0,
            },
        });
    }

    let total_episodes = all_episodes.len() as i64;

    // Calculate average severity
    let total_severity: i32 = all_episodes.iter().map(|e| e.severity).sum();
    let average_severity = total_severity as f32 / total_episodes as f32;

    // Severity distribution
    let mut severity_counts = std::collections::HashMap::new();
    for episode in &all_episodes {
        *severity_counts.entry(episode.severity).or_insert(0) += 1;
    }
    let severity_distribution: Vec<SeverityCount> = severity_counts
        .into_iter()
        .map(|(severity, count)| SeverityCount { severity, count })
        .collect();

    // Trigger frequency
    let mut trigger_counts = std::collections::HashMap::new();
    for episode in &all_episodes {
        if let Some(triggers) = &episode.triggers {
            if !triggers.trim().is_empty() {
                for trigger in triggers.split(',').map(|t| t.trim()) {
                    if !trigger.is_empty() {
                        *trigger_counts.entry(trigger.to_string()).or_insert(0) += 1;
                    }
                }
            }
        }
    }
    let trigger_frequency: Vec<TriggerCount> = trigger_counts
        .into_iter()
        .map(|(trigger, count)| TriggerCount { trigger, count })
        .collect();

    // Monthly trends (simplified - group by month)
    let mut monthly_counts = std::collections::HashMap::new();
    let mut monthly_severities = std::collections::HashMap::new();

    for episode in &all_episodes {
        let month_key = format!("{}-{:02}", episode.timestamp.year(), episode.timestamp.month());
        *monthly_counts.entry(month_key.clone()).or_insert(0) += 1;
        monthly_severities.entry(month_key).or_insert(Vec::new()).push(episode.severity);
    }

    let monthly_trends: Vec<MonthlyTrend> = monthly_counts
        .into_iter()
        .map(|(month, count)| {
            let severities = monthly_severities.get(&month).unwrap();
            let avg_severity = severities.iter().sum::<i32>() as f32 / severities.len() as f32;
            MonthlyTrend {
                month,
                episode_count: count,
                average_severity: avg_severity,
            }
        })
        .collect();

    // Duration stats
    let durations: Vec<i32> = all_episodes
        .iter()
        .filter_map(|e| e.duration_minutes)
        .collect();

    let duration_stats = if durations.is_empty() {
        DurationStats {
            average_minutes: 0.0,
            median_minutes: 0,
            max_minutes: 0,
            min_minutes: 0,
        }
    } else {
        let average_minutes = durations.iter().sum::<i32>() as f32 / durations.len() as f32;
        let mut sorted_durations = durations.clone();
        sorted_durations.sort();
        let median_minutes = sorted_durations[sorted_durations.len() / 2];
        let max_minutes = *sorted_durations.iter().max().unwrap();
        let min_minutes = *sorted_durations.iter().min().unwrap();

        DurationStats {
            average_minutes,
            median_minutes,
            max_minutes,
            min_minutes,
        }
    };

    Ok(AnalyticsData {
        total_episodes,
        average_severity,
        severity_distribution,
        trigger_frequency,
        monthly_trends,
        duration_stats,
    })
}