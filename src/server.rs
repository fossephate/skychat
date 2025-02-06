use crate::convo::ConvoManager;
use openmls::{group::GroupId, prelude::KeyPackage};
use reqwest;
use serde::{Deserialize, Serialize};
use serde_json;
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConvoUser {
    pub name: String,
    pub user_id: String,
    pub serialized_key_package: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]

pub struct ConvoInvite {
    pub group_name: String,
    pub welcome_message: Vec<u8>,
    pub ratchet_tree: Option<Vec<u8>>,
    pub global_index: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConvoMessage {
    pub sender_id: String,
    pub message: Option<Vec<u8>>,
    pub unix_timestamp: u64,
    pub invite: Option<ConvoInvite>,
    pub global_index: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConvoGroup {
    pub group_id: Vec<u8>,
    pub group_name: String,
    pub global_index: u64,
    pub user_ids: Vec<String>,
    pub messages: Vec<ConvoMessage>,
    pub user_specific_messages: HashMap<String, Vec<ConvoMessage>>,
}

pub struct ConvoServer {
    // groups: HashMap<String, ConvoManager>,
    pub manager: ConvoManager,
    pub users: HashMap<String, ConvoUser>,
    pub groups: HashMap<Vec<u8>, ConvoGroup>,
}

impl ConvoServer {
    pub fn new() -> Self {
        Self {
            manager: ConvoManager::init("server".to_string()),
            users: HashMap::new(),
            groups: HashMap::new(),
        }
    }

    pub fn client_create_group(
        &mut self,
        group_id: Vec<u8>,
        group_name: String,
        sender_id: String,
    ) {
        // first check if the group_id is already in the server
        if self.groups.contains_key(&group_id) {
            // return Err("Group already exists".to_string());
            panic!("Group already exists");
        }
        // create the ConvoGroup
        let group = ConvoGroup {
            group_id: group_id.clone(),
            group_name: group_name.clone(),
            global_index: 0,
            user_ids: vec![sender_id.clone()],
            messages: Vec::new(),
            user_specific_messages: HashMap::new(),
        };
        self.groups.insert(group_id, group);
    }

    pub fn client_accept_invite(&mut self, group_id: Vec<u8>, sender_id: String) {
        let group = self.groups.get_mut(&group_id).expect("Group not found");
        group.user_ids.push(sender_id.clone());

        // delete the invite from the user_specific_messages for the sender_id:
        // TODO: just delete the most recent message or more specifically the invite!:
        group.user_specific_messages.remove(&sender_id);
    }

    // function with client_ are callable by clients:
    pub fn client_connect(
        &mut self,
        user_id: String,
        name: String,
        serialized_key_package: Vec<u8>,
    ) {
        self.users.insert(
            user_id.clone(),
            ConvoUser {
                user_id: user_id.clone(),
                name: name,
                serialized_key_package: serialized_key_package,
            },
        );
    }

    pub fn client_list_users(&self) -> Vec<ConvoUser> {
        self.users.values().cloned().collect()
    }

    pub fn client_get_new_messages(
        &self,
        group_id: Vec<u8>,
        sender_id: String,
        index: u64,
    ) -> Vec<ConvoMessage> {
        let group = self.groups.get(&group_id);
        if group.is_none() {
            return Vec::new();
        }
        let group = group.unwrap();
        let messages: Vec<ConvoMessage> = group.messages.clone();
        let mut new_messages: Vec<ConvoMessage> = Vec::new();

        // get the user_specific_messages for the sender_id:
        let user_specific_messages = group.user_specific_messages.get(&sender_id);

        // slice the messages and return messages >= index:
        new_messages = messages.clone();
        if let Some(specific_messages) = user_specific_messages {
            new_messages.extend(specific_messages.iter().cloned());
        }
        // filter all messages with global_index >= index:
        new_messages = new_messages
            .into_iter()
            .filter(|message| message.global_index >= index)
            .collect::<Vec<ConvoMessage>>();

        // new_messages = messages.into_iter().skip(index as usize).collect::<Vec<ConvoMessage>>();

        // add the user_specific_messages to the messages:
        // new_messages.extend(user_specific_messages);

        // delete all user_specific_messages for the sender_id since they should be processed:
        // TODO: unsafe! this should be acknowledged by the client before deleting, or the client should schedule deletion
        // group.user_specific_messages.remove(&sender_id);

        new_messages
    }

    // update the ConvoGroup with fanned out messages specific for the invited user + updates for everyone else:
    pub fn client_invite_user(
        &mut self,
        group_id: Vec<u8>,
        sender_id: String,
        receiver_id: String,
        welcome_message: Vec<u8>,
        ratchet_tree: Vec<u8>,
    ) {
        // print all groups:
        println!("Groups: {:?}", self.groups);
        let mut group = self.groups.get_mut(&group_id).expect("Group not found");
        // group.user_ids.push(user_id);
        // group.user_specific_messages.insert(user_id, Vec::new());

        // update the group with the fanned out messages:
        // check if the user_id already has a user_specific_messages vector:
        if !group
            .user_specific_messages
            .contains_key(&receiver_id.clone())
        {
            group
                .user_specific_messages
                .insert(receiver_id.clone(), Vec::new());
        }
        // add the welcome_message to the user_specific_messages vector:
        group
            .user_specific_messages
            .get_mut(&receiver_id)
            .unwrap()
            .push(ConvoMessage {
                global_index: group.global_index,
                sender_id: sender_id.clone(),
                message: None,
                unix_timestamp: 0,
                invite: Some(ConvoInvite {
                    global_index: group.global_index,
                    group_name: group.group_name.clone(),
                    welcome_message: welcome_message,
                    ratchet_tree: Some(ratchet_tree),
                }),
            });
        group.global_index += 1;
    }

    // return nothing or throws an error:
    pub fn client_send_message(
        &mut self,
        group_id: Vec<u8>,
        sender_id: String,
        message: Vec<u8>,
        global_index: u64,
    ) -> Result<(), String> {
        let group = self.groups.get_mut(&group_id).expect("Group not found");

        if (global_index == group.global_index) {
            group.messages.push(ConvoMessage {
                global_index: group.global_index,
                sender_id: sender_id.clone(),
                message: Some(message.clone()),
                unix_timestamp: 0,
                invite: None,
            });
            group.global_index += 1;
            return Ok(());
        } else {
            // if (global_index > group.global_index) {
            //     // TODO: send a message to the client that the message is out of order
            //     return Err("Message is somehow too new!".to_string());
            // } else {
            //     // TODO: send a message to the client that the message is out of order
            //     return Err("Message is too old! (need to sync first)".to_string());
            // }
            return Ok(());
        }
    }
}

pub struct ConvoClient {
    pub name: String,
    pub user_id: String,
    pub manager: ConvoManager,
    pub server_address: Option<String>,
}

impl ConvoClient {
    pub fn new(name: String) -> Self {
        Self {
            name: name.clone(),
            user_id: uuid::Uuid::new_v4().to_string(),
            manager: ConvoManager::init(name.clone()),
            server_address: None,
        }
    }

    pub async fn create_group(&mut self, group_name: String) {
        // let group = ConvoManager::init(group_name);
        // self.groups.insert(group_name, group);
        // group

        let address = self
            .server_address
            .as_ref()
            .expect("server address is not set");

        // create the local group:
        // TODO: ensure the group_id is truly unique!
        let group_id = self.manager.create_new_group(group_name.clone());

        // send a POST request to the server/api/create_group
        let client = reqwest::Client::new();
        let response = client
            .post(format!("{}/api/create_group", address))
            .json(&serde_json::json!({
              "group_id": group_id.clone(),
              "group_name": group_name.clone(),
              "sender_id": self.user_id.clone(),
            }))
            .send()
            .await;
    }

    pub async fn get_group_id(&self, group_name: String) -> Vec<u8> {
        // get group where group.name == group_name:
        let (group_id, group) = self
            .manager
            .groups
            .iter()
            .find(|(_, group)| group.name == group_name)
            .expect("group not found");
        group_id.clone()
    }

    pub async fn connect_to_server(&mut self, server_address: String) {
        self.server_address = Some(server_address.clone());
        // use reqwest to send a POST request to the server/api/connect
        let client = reqwest::Client::new();
        let response = client
            .post(format!("{}/api/connect", server_address.clone()))
            .json(&serde_json::json!({
              "name": self.name.clone(),
              "user_id": self.user_id.clone(),
              "serialized_key_package": self.manager.get_key_package()
            }))
            .send()
            .await;
    }

    pub async fn list_users(&self) -> Vec<ConvoUser> {
        let address = self
            .server_address
            .as_ref()
            .expect("server address is not set");

        let client = reqwest::Client::new();
        let response = client
            .get(format!("{}/api/list_users", address))
            .send()
            .await;
        // println!("Response: {:?}", response);

        let users: Vec<ConvoUser> = response
            .expect("failed to get response")
            .json()
            .await
            .expect("failed to parse response");
        users
    }

    pub async fn invite_user_to_group(
        &mut self,
        receiver_id: String,
        group_id: Vec<u8>,
        serialized_key_package: Vec<u8>,
    ) {
        let address = self
            .server_address
            .as_ref()
            .expect("server address is not set");

        // get the mls_group (as mut) and construct the invite using their key_package:
        // get group where group_id matches:
        // let group = self.manager.groups.get(&group_id).expect("group not found");
        // let mls_group = &mut group.mls_group;

        let group_invite = self
            .manager
            .create_invite(group_id.clone(), serialized_key_package);

        let client = reqwest::Client::new();
        let response = client
            .post(format!("{}/api/invite_user", address))
            .json(&serde_json::json!({
              "group_id": group_id.clone(),
              "sender_id": self.user_id.clone(),
              "receiver_id": receiver_id.clone(),
              "welcome_message": group_invite.welcome.clone(),
              "ratchet_tree": group_invite.ratchet_tree.clone(),
            }))
            .send()
            .await;

        if response.is_ok() {
            println!("Invite sent successfully");
            // increment the global_index of the group:
            let group = self
                .manager
                .groups
                .get_mut(&group_id)
                .expect("group not found");
            group.global_index += 1;
        } else {
            panic!("Failed to send invite");
        }
    }

    pub async fn process_invite(&mut self, invite: ConvoInvite) {
        // add the welcome_message to the manager
        self.manager.process_invite(
            invite.group_name.clone(),
            invite.welcome_message.clone(),
            invite.ratchet_tree.clone(),
        );
        // let the server know we have successfully processed the invite:
        let address = self
            .server_address
            .as_ref()
            .expect("server address is not set");

        // get the group_id from the manager:
        let group_id = self
            .manager
            .groups
            .iter()
            .find(|(_, group)| group.name == invite.group_name)
            .unwrap()
            .0
            .clone();

        let client = reqwest::Client::new();
        let response = client
            .post(format!("{}/api/accept_invite", address))
            .json(&serde_json::json!({
              "group_id": group_id.clone(),
              "sender_id": self.user_id.clone(),
            }))
            .send()
            .await;
    }

    pub fn process_text_message(&mut self, message: ConvoMessage) {
        // add the message to the manager
        // self.manager.process_incoming_message(group_id, serialized_message)
    }

    pub async fn process_new_messages(&mut self, group_id: Vec<u8>, messages: Vec<ConvoMessage>) {
        // add the messages to the manager
        // self.manager.add_messages(messages);

        // loop through the messages and process them by type:
        for message in messages {
            // TODO: this auto accepts invites!:
            // if the message contains an invite, process it:
            if message.invite.is_some() {
                let invite = message.invite.unwrap();
                self.process_invite(invite).await;
            }

            if message.message.is_some() {
                // self.process_text_message(message.clone().message);
                let serialized_message = message.message.unwrap();
                self.manager
                    .process_incoming_message(group_id.clone(), serialized_message);
            }
        }
    }

    pub async fn check_incoming_messages(&mut self, group_id: Vec<u8>) {
        let address = self
            .server_address
            .as_ref()
            .expect("server address is not set");

        let client = reqwest::Client::new();
        let response = client
            .post(format!("{}/api/get_new_messages", address))
            .json(&serde_json::json!({
              "group_id": group_id.clone(),
              "sender_id": self.user_id.clone(),
              "index": 0,
            }))
            .send()
            .await;

        // should be a Vec<ConvoMessage>
        let messages: Vec<ConvoMessage> = response
            .expect("failed to get response")
            .json()
            .await
            .expect("failed to parse response");

        // println!("Response: {:?}", messages);
        self.process_new_messages(group_id, messages).await;
    }

    pub async fn send_message(&mut self, group_id: Vec<u8>, message: String) {
        let msg = self.manager.create_message(group_id.clone(), message);

        let mut group = self
            .manager
            .groups
            .get_mut(&group_id.clone())
            .expect("group not found");

        let address = self
            .server_address
            .as_ref()
            .expect("server address is not set");

        let client = reqwest::Client::new();
        let response = client
            .post(format!("{}/api/send_message", address))
            .json(&serde_json::json!({
              "group_id": group_id.clone(),
              "sender_id": self.user_id.clone(),
              "message": msg.clone(),
              "global_index": group.global_index.clone(),
            }))
            .send()
            .await;

        // if response isn't an error, increment the global_index of the group:
        if response.is_ok() {
            group.global_index += 1;
        }
    }

    pub fn get_group_messages(&self, group_id: Vec<u8>) -> Vec<String> {
        let group = self.manager.groups.get(&group_id).expect("group not found");
        group.decrypted.clone()
    }
}
