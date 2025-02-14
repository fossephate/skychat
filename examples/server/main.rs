#[macro_use]
extern crate rocket;

use rocket::Config;
use skychat::convo::server::ConvoServer;
use tokio::time::interval;
use std::sync::{Arc, Mutex};
use std::time::Duration;
mod web;
use web::*;

#[tokio::main]
async fn main() {
    println!("Starting server...");

    let config = Config {
        address: "0.0.0.0".parse().unwrap(),
        port: 8888,
        ..Config::default()
    };

    let server_state = ServerState {
        convo_server: Arc::new(Mutex::new(ConvoServer::new())),
    };

    let server_state_clone = ServerState {
        convo_server: Arc::clone(&server_state.convo_server),
    };

    tokio::spawn(async move {
        let mut interval = interval(Duration::from_secs(10));
        loop {
            interval.tick().await;
            server_state_clone.convo_server.lock().unwrap().cleanup_inactive_users();
        }
    });

    let rocket = rocket::custom(config)
        .mount(
            "/api",
            routes![
                connect,
                list_users,
                invite_user,
                create_group,
                get_new_messages,
                accept_invite,
                send_message,
                group_index,
            ],
        )
        .manage(server_state);

    if let Err(e) = rocket.launch().await {
        println!("Rocket server error: {}", e);
    }
}
