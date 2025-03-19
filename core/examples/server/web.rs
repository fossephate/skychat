// src/web.rs

use std::sync::{Arc, Mutex};
use std::collections::HashMap;

use rocket::{get, post};
use rocket::serde::json::Json;
use rocket::serde::{Deserialize, Serialize};
use rocket::State;

use skychat_server::server::{ConvoServer, ConvoUser};
use skychat_core::manager::{ConvoMessage, ConvoInvite};

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


// base64 utils:
type EncodedBase64 = String;
use base64::{Engine as _, engine::general_purpose};
use std::error::Error;
pub struct BufferConverter;
impl BufferConverter {
    /// Converts a byte slice to a base64 string
    /// 
    /// # Arguments
    /// * `buffer` - The byte slice to convert
    /// 
    /// # Returns
    /// A String containing the base64 encoded data
    pub fn to_base64(buffer: &[u8]) -> String {
        general_purpose::STANDARD.encode(buffer)
    }

    /// Converts a base64 string back to a Vec<u8>
    /// 
    /// # Arguments
    /// * `base64` - The base64 string to convert
    /// 
    /// # Returns
    /// Result containing either the decoded bytes or an error
    pub fn from_base64(base64: &str) -> Result<Vec<u8>, Box<dyn Error>> {
        Ok(general_purpose::STANDARD.decode(base64)?)
    }
}



// POST /api/connect (json containing name and user_id)

#[derive(Debug, Serialize, Deserialize)]
pub struct User {
    user_id: String,
    serialized_key_package: EncodedBase64,
}

// POST /connect (json containing name and user_id)
#[post("/connect", format = "json", data = "<user>")]
pub async fn connect(user: Json<User>, state: &State<ServerState>) -> Json<User> {
    let mut server = state.convo_server.lock().expect("failed to lock server!");
    server.client_connect(
        user.user_id.clone(),
        BufferConverter::from_base64(&user.serialized_key_package).unwrap(),
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
    pub group_id: EncodedBase64,
    pub message: EncodedBase64,
    pub sender_id: String,
    pub global_index: u64,
}
#[post("/send_message", format = "json", data = "<data>")]
pub async fn send_message(data: Json<SendMessage>, state: &State<ServerState>) {
    let mut server = state.convo_server.lock().expect("failed to lock server!");
    let res = server.client_send_message(
        BufferConverter::from_base64(&data.group_id).unwrap(),
        data.sender_id.clone(),
        BufferConverter::from_base64(&data.message).unwrap(),
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
    pub group_id: EncodedBase64,
    pub group_name: String,
    pub sender_id: String, // the user creating the group
}
#[post("/create_group", format = "json", data = "<data>")]
pub async fn create_group(data: Json<CreateGroup>, state: &State<ServerState>) {
    let mut server = state.convo_server.lock().expect("failed to lock server!");
    server.client_create_group(
        BufferConverter::from_base64(&data.group_id).unwrap(),
        data.group_name.clone(),
        data.sender_id.clone(),
    );
}

// POST /get_user_keys (json containing list of user_ids, return map of serialized_key_packages)
#[derive(Debug, Serialize, Deserialize)]
pub struct GetUserKeys {
    pub user_ids: Vec<String>,
}
#[post("/get_user_keys", format = "json", data = "<data>")]
pub async fn get_user_keys(data: Json<GetUserKeys>, state: &State<ServerState>) -> Json<HashMap<String, String>> {
    let server = state.convo_server.lock().expect("failed to lock server!");
    let keys_map = server.client_get_user_keys(data.user_ids.clone()).unwrap();
    
    // Convert the binary key packages to base64 strings while preserving the user ID mapping
    let base64_keys_map = keys_map.into_iter()
        .map(|(user_id, key)| (user_id, BufferConverter::to_base64(&key)))
        .collect::<HashMap<String, String>>();
        
    Json(base64_keys_map)
}

// GET /get_new_messages (json containing group_id and index)
// returns Vec<ConvoMessage>
#[derive(Debug, Serialize, Deserialize)]
pub struct GetMessages {
    pub group_id: Option<EncodedBase64>, // the group to get messages from
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
        data.group_id.as_ref().map(|g| BufferConverter::from_base64(g).unwrap()),
        data.sender_id.clone(),
        data.index.clone(),
    );
    Json(messages.unwrap())
}

// POST /invite_user (json containing group_id, user_id, and welcome_message)
// return nothing or error
#[derive(Debug, Serialize, Deserialize)]
pub struct InviteUser {
    pub group_id: EncodedBase64,        // the group to invite the user to
    pub sender_id: String,        // the user sending the invite
    pub receiver_id: String,      // the user to invite
    pub welcome_message: EncodedBase64, // the welcome message to send to the user
    pub ratchet_tree: EncodedBase64,    // the ratchet tree to send to the user
    pub fanned: Option<EncodedBase64>, // the fanned commit to send to all other users in the group
}

#[post("/invite_user", format = "json", data = "<data>")]
pub async fn invite_user(data: Json<InviteUser>, state: &State<ServerState>) {
    let mut server = state.convo_server.lock().expect("failed to lock server!");
    server.client_invite_user(
        BufferConverter::from_base64(&data.group_id).unwrap(),
        data.sender_id.clone(),
        data.receiver_id.clone(),
        BufferConverter::from_base64(&data.welcome_message).unwrap(),
        BufferConverter::from_base64(&data.ratchet_tree).unwrap(),
        data.fanned.as_ref().map(|f| BufferConverter::from_base64(f).unwrap()),
    );
}

// POST /accept_invite (json containing group_id, user_id, )
#[derive(Debug, Serialize, Deserialize)]
pub struct AcceptInvite {
    pub group_id: EncodedBase64,
    pub sender_id: String,
}
#[post("/accept_invite", format = "json", data = "<data>")]
pub async fn accept_invite(data: Json<AcceptInvite>, state: &State<ServerState>) {
    let mut server = state.convo_server.lock().expect("failed to lock server!");
    server.client_accept_invite(
        BufferConverter::from_base64(&data.group_id).unwrap(),
        data.sender_id.clone(),
    );
}

// GET /group_info (json containing group_id and sender_id)
#[derive(Debug, Serialize, Deserialize)]
pub struct GetGroupInfo {
    pub group_id: EncodedBase64,
    pub sender_id: String,
}
#[post("/group_index", format = "json", data = "<data>")]
pub async fn group_index(data: Json<GetGroupInfo>, state: &State<ServerState>) -> Json<u64> {
    let server = state.convo_server.lock().expect("failed to lock server!");
    // let messages = server.client_get_group_info(data.group_id.clone(), data.sender_id.clone());
    let global_index = server.client_get_group_index(
        BufferConverter::from_base64(&data.group_id).unwrap(),
        data.sender_id.clone(),
    );
    Json(global_index.unwrap())
}