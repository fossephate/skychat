#[macro_use]
extern crate rocket;

use rocket::Config;
use skychat_server::server::ConvoServer;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::time::interval;
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

    // todo: disabled for now:
    // tokio::spawn(async move {
    //     let mut interval = interval(Duration::from_secs(10));
    //     loop {
    //         interval.tick().await;
    //         server_state_clone.convo_server.lock().unwrap().cleanup_inactive_users();
    //     }
    // });

    let rocket = rocket::custom(config)
        .mount(
            "/api",
            routes![
                connect,
                list_users,
                invite_user,
                create_group,
                get_new_messages,
                get_new_messages_bin,
                accept_invite,
                send_message,
                group_index,
                get_user_keys,
            ],
        )
        .manage(server_state);

    if let Err(e) = rocket.launch().await {
        println!("Rocket server error: {}", e);
    }
}
