// main.rs
use actix_web::{
    web, App, HttpResponse, HttpServer, Responder,
    http::header, middleware::Logger
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use qrcode::QrCode;
use local_ip_address::local_ip;
use std::{
    sync::{Arc, Mutex},
    time::{SystemTime, UNIX_EPOCH},
    collections::HashMap
};
use lazy_static::lazy_static;

// Structures de données
#[derive(Debug, Clone, Serialize, Deserialize)]
struct User {
    id: String,
    name: String,
    avatar_index: u8,
    join_time: u64,
    ip_address: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct LobbySession {
    code: String,
    name: String,
    owner: String,
    password: Option<String>,
    users: HashMap<String, User>,
    created_at: u64,
    max_players: u8,
    latest_command: Option<Command>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Command {
    command: String,
    payload: serde_json::Value,
    timestamp: i64,
}

// État global
lazy_static! {
    static ref ACTIVE_SESSIONS: Arc<Mutex<HashMap<String, LobbySession>>> = 
        Arc::new(Mutex::new(HashMap::new()));
}

// Handlers API
async fn create_lobby(payload: web::Json<serde_json::Value>) -> impl Responder {
    let req = payload.into_inner();
    let ip = match local_ip() {
        Ok(ip) => ip.to_string(),
        Err(_) => "127.0.0.1".to_string()
    };

    let code = nanoid::nanoid!(4).to_uppercase();
    let user_id = rand::random::<u32>().to_string();

    let lobby = LobbySession {
        code: code.clone(),
        name: format!("Salon de {}", req["playerName"].as_str().unwrap_or("Anonyme")),
        owner: user_id.clone(),
        password: req["password"].as_str().map(|s| s.to_string()),
        users: HashMap::new(),
        created_at: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs(),
        max_players: req["maxPlayers"].as_u64().unwrap_or(8) as u8,
        latest_command: None,
    };

    ACTIVE_SESSIONS.lock().unwrap().insert(code.clone(), lobby);

    HttpResponse::Ok().json(json!({
        "success": true,
        "roomCode": code,
        "userId": user_id,
    }))
}

async fn join_lobby(payload: web::Json<serde_json::Value>) -> impl Responder {
    // Implémentation similaire à create_lobby
}

async fn get_lobbies() -> impl Responder {
    let sessions = ACTIVE_SESSIONS.lock().unwrap();
    let lobbies: Vec<_> = sessions.values().map(|l| json!({
        "code": l.code,
        "name": l.name,
        "hasPassword": l.password.is_some(),
        "players": l.users.len(),
        "maxPlayers": l.max_players
    })).collect();
    
    HttpResponse::Ok().json(json!({ "lobbies": lobbies }))
}

// Gestion QR Code
async fn generate_qr() -> impl Responder {
    let ip = local_ip().unwrap().to_string();
    let qr = QrCode::new(format!("http://{}:31", ip)).unwrap();
    let svg = qr.render()
        .min_dimensions(200, 200)
        .dark_color("#000000")
        .light_color("#ffffff")
        .build();

    HttpResponse::Ok().json(json!({
        "url": format!("http://{}:31", ip),
        "qr_code": svg
    }))
}

// Configuration serveur
#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));

    HttpServer::new(|| {
        App::new()
            .wrap(Logger::default())
            .wrap(
                actix_cors::Cors::default()
                    .allow_any_origin()
                    .allowed_methods(vec!["GET", "POST", "DELETE", "OPTIONS"])
                    .allowed_headers(vec![header::CONTENT_TYPE])
            )
            .service(
                web::scope("/api")
                    .route("/lobbies", web::get().to(get_lobbies))
                    .route("/lobby/create", web::post().to(create_lobby))
                    .route("/lobby/join", web::post().to(join_lobby))
                    .route("/get_ip", web::get().to(generate_qr))
            )
            .service(actix_files::Files::new("/", "./Files").index_file("index.html"))
    })
    .bind(("0.0.0.0", 31))?
    .workers(4)
    .run()
    .await
}