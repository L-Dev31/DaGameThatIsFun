use serde::{Serialize, Deserialize};
use std::sync::{Arc, Mutex};
use chrono::{DateTime, Utc};

lazy_static::lazy_static! {
    pub static ref ACTIVE_SESSIONS: Arc<Mutex<Vec<LobbySession>>> = Arc::new(Mutex::new(Vec::new()));
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub name: String,
    pub avatar_index: u8,
    pub join_time: DateTime<Utc>,
    pub ip_address: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LobbySession {
    pub code: String,
    pub name: String,
    pub owner: String,
    pub password: Option<String>,
    pub users: Vec<User>,
    pub created_at: DateTime<Utc>,
    pub max_players: u8,
    pub latest_command: Option<Command>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Command {
    pub command: String,
    pub payload: serde_json::Value,
    pub timestamp: i64,
}