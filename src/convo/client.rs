// src/convo/client.rs

use std::collections::HashMap;

use colored::{Color, Colorize};

use crate::convo::{
    manager::ConvoManager,
    server::{ConvoInvite, ConvoMessage, ConvoUser},
};

use super::manager::MessageItem;

type GroupId = Vec<u8>;
type SerializedMessage = Vec<u8>;

pub struct ConvoClient {
    pub name: String,
    pub user_id: String,
    pub manager: ConvoManager,
    pub server_address: Option<String>,
    pub id_to_name: HashMap<String, String>,
}

impl ConvoClient {
    pub fn new(name: String) -> Self {
        Self {
            name: name.clone(),
            user_id: uuid::Uuid::new_v4().to_string(),
            manager: ConvoManager::init(name.clone()),
            server_address: None,
            id_to_name: HashMap::new(),
        }
    }

    pub async fn create_group(&mut self, group_name: String) {
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

        if response.is_ok() {
            let group = self
                .manager
                .groups
                .get_mut(&group_id)
                .expect("group not found");
            group.decrypted.push(MessageItem {
                text: "<group_created>".to_string(),
                sender_id: "system".to_string(),
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_millis() as u64,
            });
        }
    }

    pub async fn get_group_id(&self, group_name: String) -> GroupId {
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

    pub async fn list_users(&mut self) -> Vec<ConvoUser> {
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

        // populate the id_to_name map:
        for user in &users {
            self.id_to_name
                .insert(user.user_id.clone(), user.name.clone());
        }
        self.id_to_name.insert("system".to_string(), "system".to_string());

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
              "fanned": group_invite.fanned.clone(),
            }))
            .send()
            .await;

        if response.is_ok() {
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
        if response.is_ok() {
            // TODO: probably add a system message here:
        }
    }

    pub fn process_text_message(&mut self, message: ConvoMessage) {
        // add the message to the manager
        // self.manager.process_incoming_message(group_id, serialized_message)
    }

    pub async fn process_new_messages(&mut self, messages: Vec<ConvoMessage>, group_id: Option<GroupId>) {
        // add the messages to the manager
        // self.manager.add_messages(messages);

        // loop through the messages and process them by type:
        for message in messages {
            // // TODO: this auto accepts invites!:
            // if the message contains an invite, process it:
            // if message.invite.is_some() {
            //     let invite = message.invite.unwrap();
            //     self.process_invite(invite).await;
            // }

            if message.message.is_some() && group_id.is_some() {
                let gid: Vec<u8> = group_id.clone().unwrap();
                let serialized_message = message.message.unwrap();
                self.manager.process_incoming_message(
                    gid.clone(),
                    serialized_message,
                    Some(message.sender_id.clone()),
                );
                let mut group = self.manager.groups.get_mut(&gid.clone()).unwrap();
                if message.global_index > group.global_index {
                    group.global_index = message.global_index;
                }
            }
        }
    }

    pub async fn check_incoming_messages(&mut self, group_id: Option<GroupId>) -> Vec<ConvoMessage> {
        let address = self
            .server_address
            .as_ref()
            .expect("server address is not set");

        let mut index = 0;
        if let Some(group_id) = group_id.clone() {
            if let Some(group) = self.manager.groups.get(&group_id) {
                index = group.global_index;
            }
        }

        let client = reqwest::Client::new();
        let response = client
            .post(format!("{}/api/get_new_messages", address))
            .json(&serde_json::json!({
              "group_id": Some(group_id.clone()),
              "sender_id": self.user_id.clone(),
              "index": index,
            }))
            .send()
            .await;

        // should be a Vec<ConvoMessage>
        let messages: Vec<ConvoMessage> = response
            .expect("failed to get response")
            .json()
            .await
            .expect("failed to parse response");

        self.process_new_messages(messages.clone(), group_id.clone()).await;
        messages
    }

    pub async fn get_group_index(&mut self, group_id: GroupId) -> u64 {
        let address = self
            .server_address
            .as_ref()
            .expect("server address is not set");

        let client = reqwest::Client::new();
        let response = client
            .post(format!("{}/api/group_index", address))
            .json(&serde_json::json!({
              "group_id": group_id.clone(),
              "sender_id": self.user_id.clone(),
            }))
            .send()
            .await;

        let group_index: u64 = response
            .expect("failed to get response")
            .json()
            .await
            .expect("failed to parse response");

        // println!("Group index: {:?}", group_index);
        group_index
    }

    pub async fn sync_group(&mut self, group_id: GroupId) {
        // get and process any incoming messages:
        self.check_incoming_messages(Some(group_id.clone())).await;

        let group_index = self.get_group_index(group_id.clone()).await;

        // set the group_index to the group_index:
        let group = self
            .manager
            .groups
            .get_mut(&group_id)
            .expect("group not found");

        if group_index != group.global_index {
            // println!("Group index mismatch, updating...");
            group.global_index = group_index;
        }
    }

    pub async fn send_message(&mut self, group_id: GroupId, text: String) {
        // we must always sync the group before sending a message:
        self.sync_group(group_id.clone()).await;

        let msg = self.manager.create_message(group_id.clone(), text.clone());

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
            // add this message to our own message list:
            group.decrypted.push(MessageItem {
                text: text.clone(),
                sender_id: self.user_id.clone(),
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_millis() as u64,
            });
        }
    }

    pub fn get_group_messages(&self, group_id: GroupId) -> &Vec<MessageItem> {
        let group = self.manager.groups.get(&group_id).expect("group not found");
        &group.decrypted
    }

    pub fn get_renderable_messages(&self, group_id: GroupId) -> Vec<String>{
        let messages = self.get_group_messages(group_id);
        // println!("{}", format!("Group messages: {:?}", messages).green());
        // loop through all the messages and print them, color coding the sender:

        // assign a color to each sender:
        // assign a color to each sender:
        let mut sender_colors = HashMap::new();
        let mut color_index = 0;
        let colors = [
            Color::Red,
            Color::Blue,
            Color::Yellow,
            Color::Magenta,
            Color::Cyan,
            Color::Green,
        ];

        for sender in self.id_to_name.keys() {
            sender_colors.insert(sender.clone(), colors[color_index % colors.len()]);
            color_index += 1;
        }

        let mut display_messages = Vec::new();

        for message in messages {
            let sender_name = self
                .id_to_name
                .get(&message.sender_id)
                .expect("sender not found");
            let color = sender_colors
                .get(&message.sender_id)
                .expect("color not found");

            display_messages.push(format!("{}: {}", sender_name.color(*color).bold(), message.text));

            // Use the color to format the sender name, leave message plain
            println!("{}: {}", sender_name.color(*color).bold(), message.text);
        }

        display_messages
    }

    pub fn print_group_messages(&self, group_id: GroupId) -> Vec<String>{
        let messages = self.get_group_messages(group_id);
        // println!("{}", format!("Group messages: {:?}", messages).green());
        // loop through all the messages and print them, color coding the sender:

        // assign a color to each sender:
        // assign a color to each sender:
        let mut sender_colors = HashMap::new();
        let mut color_index = 0;
        let colors = [
            Color::Red,
            Color::Blue,
            Color::Yellow,
            Color::Magenta,
            Color::Cyan,
            Color::Green,
        ];

        for sender in self.id_to_name.keys() {
            sender_colors.insert(sender.clone(), colors[color_index % colors.len()]);
            color_index += 1;
        }

        let mut display_messages = Vec::new();

        for message in messages {
            let sender_name = self
                .id_to_name
                .get(&message.sender_id)
                .expect("sender not found");
            let color = sender_colors
                .get(&message.sender_id)
                .expect("color not found");

            display_messages.push(format!("{}: {}", sender_name.color(*color).bold(), message.text));

            // Use the color to format the sender name, leave message plain
            println!("{}: {}", sender_name.color(*color).bold(), message.text);
        }

        display_messages
    }

    pub fn name_to_id(&self, user_name: String) -> String {
        self.id_to_name
            .iter()
            .find(|(_, name)| **name == user_name)
            .map(|(id, _)| id.clone())
            .unwrap()
    }
}
