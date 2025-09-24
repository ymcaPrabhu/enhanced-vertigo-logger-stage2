use diesel::prelude::*;
use diesel::sqlite::SqliteConnection;
use std::env;
use std::fs;
use std::path::Path;

pub fn ensure_database_setup() -> Result<SqliteConnection, Box<dyn std::error::Error>> {
    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "vertigo.db".to_string());

    // Create directory if it doesn't exist
    if let Some(parent) = Path::new(&database_url).parent() {
        fs::create_dir_all(parent)?;
    }

    let mut conn = SqliteConnection::establish(&database_url)?;

    // Run initial migration if needed
    let migration_sql = include_str!("../migrations/001_create_episodes.sql");

    // Check if table exists
    let table_exists = diesel::sql_query("SELECT name FROM sqlite_master WHERE type='table' AND name='episodes'")
        .execute(&mut conn)
        .map(|rows| rows > 0)
        .unwrap_or(false);

    if !table_exists {
        println!("📊 Creating database schema...");
        diesel::sql_query(migration_sql).execute(&mut conn)?;
        println!("✅ Database schema created successfully");

        // Insert some demo data for production demo
        insert_demo_data(&mut conn)?;
    }

    Ok(conn)
}

fn insert_demo_data(conn: &mut SqliteConnection) -> Result<(), Box<dyn std::error::Error>> {
    println!("📋 Inserting demo episodes for production showcase...");

    let demo_episodes = vec![
        (3, Some(45), "Spinning sensation, mild nausea", Some("Standing up quickly"), Some("Home"), Some("Reading for 2 hours"), None::<String>, Some("Moderate episode likely triggered by positional changes. Consider gradual movements."), "2025-09-17 14:30:00"),
        (2, Some(20), "Light dizziness, balance issues", Some("Stress, lack of sleep"), Some("Office"), Some("Working on computer"), Some("Ibuprofen"), Some("Mild episode associated with stress. Consider stress management techniques."), "2025-09-19 10:15:00"),
        (4, Some(90), "Severe spinning, vomiting", Some("Unknown"), Some("Home"), Some("Sleeping"), Some("Dramamine"), Some("Severe episode with concerning duration. Recommend medical consultation."), "2025-09-21 07:45:00"),
        (1, Some(15), "Brief dizziness", Some("Dehydration"), Some("Gym"), Some("Exercise"), None::<String>, Some("Mild episode likely due to dehydration. Ensure adequate hydration before exercise."), "2025-09-22 16:20:00"),
        (3, Some(60), "Moderate spinning, headache", Some("Weather change"), Some("Car"), Some("Driving"), None::<String>, Some("Weather-related episode. Monitor atmospheric pressure changes."), "2025-09-23 09:10:00"),
    ];

    for (severity, duration, symptoms, triggers, location, activities, medications, ai_analysis, timestamp) in demo_episodes {
        diesel::sql_query(
            "INSERT INTO episodes (severity, duration_minutes, symptoms, triggers, location, activities_before, medications_taken, ai_analysis, timestamp, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))"
        )
        .bind::<diesel::sql_types::Integer, _>(severity)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Integer>, _>(duration)
        .bind::<diesel::sql_types::Text, _>(symptoms)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(triggers)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(location)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(activities)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(medications)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(ai_analysis)
        .bind::<diesel::sql_types::Text, _>(timestamp)
        .execute(conn)?;
    }

    println!("✅ Demo episodes inserted successfully");
    Ok(())
}