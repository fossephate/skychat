// src/web.rs

use std::sync::{Arc, Mutex};

use rocket::{get, post};
use rocket::serde::json::Json;
use rocket::serde::{Deserialize, Serialize};
use rocket::State;

use crate::convo::server::{ConvoServer, ConvoUser};
use crate::convo::manager::{ConvoMessage, ConvoInvite};

pub struct ServerState {
    pub convo_server: Arc<Mutex<ConvoServer>>,
}

impl Clone for ServerState {
    fn clone(&self) -> Self {
        ServerState {
            convo_server: Arc::clone(&self.convo_server),
        }
    }
}



// POST /api/connect (json containing name and user_id)

#[derive(Debug, Serialize, Deserialize)]
pub struct User {
    name: String,
    user_id: String,
    serialized_key_package: Vec<u8>,
}

// POST /connect (json containing name and user_id)
#[post("/connect", format = "json", data = "<user>")]
pub async fn connect(user: Json<User>, state: &State<ServerState>) -> Json<User> {
    let mut server = state.convo_server.lock().expect("failed to lock server!");
    server.client_connect(
        user.user_id.clone(),
        user.name.clone(),
        user.serialized_key_package.clone(),
    );
    println!("Received user: {:?}", user);
    user
}

// GET /list_users
#[get("/list_users")]
pub async fn list_users(state: &State<ServerState>) -> Json<Vec<ConvoUser>> {
    let server = state.convo_server.lock().expect("failed to lock server!");
    let users = server.client_list_users();
    Json(users)
}

// POST /send_message (json containing group_id, message)
#[derive(Debug, Serialize, Deserialize)]
pub struct SendMessage {
    pub group_id: Vec<u8>,
    pub message: Vec<u8>,
    pub sender_id: String,
    pub global_index: u64,
}
#[post("/send_message", format = "json", data = "<data>")]
pub async fn send_message(data: Json<SendMessage>, state: &State<ServerState>) {
    let mut server = state.convo_server.lock().expect("failed to lock server!");
    let res = server.client_send_message(
        data.group_id.clone(),
        data.sender_id.clone(),
        data.message.clone(),
        data.global_index.clone(),
    );
    if res.is_err() {
        panic!("failed to send message: {:?}", res);
    }
    // Json(res)
}

// POST /create_group (json containing group_id and group_name)
// return nothing or error
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateGroup {
    pub group_id: Vec<u8>,
    pub group_name: String,
    pub sender_id: String, // the user creating the group
}
#[post("/create_group", format = "json", data = "<data>")]
pub async fn create_group(data: Json<CreateGroup>, state: &State<ServerState>) {
    let mut server = state.convo_server.lock().expect("failed to lock server!");
    server.client_create_group(
        data.group_id.clone(),
        data.group_name.clone(),
        data.sender_id.clone(),
    );
}

// GET /get_new_messages (json containing group_id and index)
// returns Vec<ConvoMessage>
#[derive(Debug, Serialize, Deserialize)]
pub struct GetMessages {
    pub group_id: Option<Vec<u8>>, // the group to get messages from
    pub sender_id: String, // the user requesting the messages
    pub index: u64,        // the index of the first message to get
}
#[post("/get_new_messages", format = "json", data = "<data>")]
pub async fn get_new_messages(
    data: Json<GetMessages>,
    state: &State<ServerState>,
) -> Json<Vec<ConvoMessage>> {
    let mut server = state.convo_server.lock().expect("failed to lock server!");
    let messages = server.client_get_new_messages(
        data.group_id.clone(),
        data.sender_id.clone(),
        data.index.clone(),
    );
    Json(messages)
}

// POST /invite_user (json containing group_id, user_id, and welcome_message)
// return nothing or error
#[derive(Debug, Serialize, Deserialize)]
pub struct InviteUser {
    pub group_id: Vec<u8>,        // the group to invite the user to
    pub sender_id: String,        // the user sending the invite
    pub receiver_id: String,      // the user to invite
    pub welcome_message: Vec<u8>, // the welcome message to send to the user
    pub ratchet_tree: Vec<u8>,    // the ratchet tree to send to the user
    pub fanned: Option<Vec<u8>>, // the fanned commit to send to all other users in the group
}

#[post("/invite_user", format = "json", data = "<data>")]
pub async fn invite_user(data: Json<InviteUser>, state: &State<ServerState>) {
    let mut server = state.convo_server.lock().expect("failed to lock server!");
    server.client_invite_user(
        data.group_id.clone(),
        data.sender_id.clone(),
        data.receiver_id.clone(),
        data.welcome_message.clone(),
        data.ratchet_tree.clone(),
        data.fanned.clone(),
    );
}

// POST /accept_invite (json containing group_id, user_id, )
#[derive(Debug, Serialize, Deserialize)]
pub struct AcceptInvite {
    pub group_id: Vec<u8>,
    pub sender_id: String,
}
#[post("/accept_invite", format = "json", data = "<data>")]
pub async fn accept_invite(data: Json<AcceptInvite>, state: &State<ServerState>) {
    let mut server = state.convo_server.lock().expect("failed to lock server!");
    server.client_accept_invite(data.group_id.clone(), data.sender_id.clone());
}

// GET /group_info (json containing group_id and sender_id)
#[derive(Debug, Serialize, Deserialize)]
pub struct GetGroupInfo {
    pub group_id: Vec<u8>,
    pub sender_id: String,
}
#[post("/group_index", format = "json", data = "<data>")]
pub async fn group_index(data: Json<GetGroupInfo>, state: &State<ServerState>) -> Json<u64> {
    let server = state.convo_server.lock().expect("failed to lock server!");
    // let messages = server.client_get_group_info(data.group_id.clone(), data.sender_id.clone());
    let global_index = server.client_get_group_index(data.group_id.clone(), data.sender_id.clone());
    Json(global_index)
}