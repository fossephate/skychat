#[macro_use]
extern crate rocket;

use rocket::Config;
use skychat::convo::server::ConvoServer;
use skychat::web::*;
use std::sync::Mutex;

#[tokio::main]
async fn main() {
    println!("Starting server...");

    let config = Config {
        port: 8080,
        ..Config::default()
    };

    let server_state = ServerState {
        convo_server: Mutex::new(ConvoServer::new()),
    };

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
                send_message
            ],
        )
        .manage(server_state);

    if let Err(e) = rocket.launch().await {
        println!("Rocket server error: {}", e);
    }
}
