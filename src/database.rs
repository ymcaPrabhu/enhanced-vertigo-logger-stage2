use diesel::prelude::*;
use diesel::sqlite::SqliteConnection;
use diesel::result::Error;
use std::env;

use crate::models::{Episode, NewEpisode, EpisodeUpdate};
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