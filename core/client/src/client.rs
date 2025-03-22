// src/convo/client.rs

use std::collections::HashMap;

use colored::{Color, Colorize};

use anyhow::{anyhow, bail, Context, Result};
use skychat_core::{
    manager::ConvoManager,
    manager::{ConvoInvite, ConvoMessage},
};

use skychat_server::server::ConvoUser;

use skychat_core::manager::MessageItem;

type GroupId = Vec<u8>;
type SerializedMessage = Vec<u8>;

// #[derive(Debug, Clone)]
// pub struct PendingInvite {
//     pub group_name: String,
//     pub sender_name: String,
//     pub invite: ConvoInvite,
// }

pub struct ConvoClient {
    pub user_id: String,
    pub manager: ConvoManager,
    pub server_address: Option<String>,
    pub id_to_name: HashMap<String, String>,
}

impl ConvoClient {
    pub fn new(id: String) -> Self {
        Self {
            user_id: id.clone(),
            manager: ConvoManager::init(id.clone()),
            server_address: None,
            id_to_name: HashMap::new(),
        }
    }

    pub async fn create_group(&mut self, group_name: String) -> Result<GroupId> {
        let address = self
            .server_address
            .as_ref()
            .context("Server address is not set")?;

        // create the local group:
        let group_id = self
            .manager
            .create_group(group_name.clone())
            .context("Failed to create new group")?;

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
            .await
            .context("Failed to send create_group request")?;

        if response.status().is_success() {
            self.manager
                .group_push_message(
                    &group_id,
                    "<group_created>".to_string(),
                    "system".to_string(),
                )
                .context("Failed to add system message")?;

            Ok(group_id)
        } else {
            Err(anyhow!("Failed to create group: {}", response.status()))
        }
    }

    // Get user key packages with anyhow error handling
    pub async fn get_user_key_packages(
        &self,
        user_ids: Vec<String>,
    ) -> Result<HashMap<String, Vec<u8>>> {
        let address = self
            .server_address
            .as_ref()
            .context("Server address is not set")?;

        let client = reqwest::Client::new();
        let response = client
            .post(format!("{}/api/get_user_keys", address))
            .json(&serde_json::json!({
                "user_ids": user_ids.clone()
            }))
            .send()
            .await
            .context("Failed to send request to get user keys")?;

        if !response.status().is_success() {
            bail!("Failed to get key packages: {}", response.status());
        }

        let key_packages: HashMap<String, Vec<u8>> = response
            .json()
            .await
            .context("Failed to parse response data")?;

        if key_packages.len() != user_ids.len() {
            bail!("Failed to get key packages for all users");
        }

        Ok(key_packages)
    }

    // Create group with users using anyhow
    pub async fn create_group_with_users(
        &mut self,
        group_name: String,
        user_ids: Vec<String>,
    ) -> Result<GroupId> {
        // Create the group
        self.create_group(group_name.clone()).await;

        // Get the group_id
        let group_id = self.get_group_id(group_name).await.expect("Failed to get group id");

        println!("Getting key packages for users: {:?}", user_ids);

        // Get key packages with error handling
        let key_packages_map = match self.get_user_key_packages(user_ids.clone()).await {
            Ok(map) => map,
            Err(e) => {
                println!("Error getting key packages: {}", e);
                // Add error message to the group
                self.manager.group_push_message(
                    &group_id,
                    format!("<error_getting_key_packages: {}>", e),
                    self.user_id.clone(),
                );
                return Err(e);
            }
        };

        println!("Key packages map: {:?}", key_packages_map);

        // Add system message that group was created
        self.manager.group_push_message(
            &group_id,
            "<group_created>".to_string(),
            self.user_id.clone(),
        );

        // Invite users and handle any errors
        for (user_id, key_package) in key_packages_map {
            match self
                .invite_user_to_group(user_id.clone(), group_id.clone(), key_package)
                .await
            {
                Ok(_) => {
                    let system_message = format!("<{}> joined the group", user_id);
                    self.manager.group_push_message(
                        &group_id,
                        system_message,
                        self.user_id.clone(),
                    );
                }
                Err(e) => {
                    let error_message = format!("<failed_to_invite_user {}: {}>", user_id, e);
                    self.manager
                        .group_push_message(&group_id, error_message, self.user_id.clone());
                    println!("Error inviting user {}: {}", user_id, e);
                }
            }
        }

        // Add finished message
        self.manager.group_push_message(
            &group_id,
            "<finished_creating_group>".to_string(),
            self.user_id.clone(),
        );

        Ok(group_id)
    }

    pub async fn invite_user_to_group(
        &mut self,
        receiver_id: String,
        group_id: Vec<u8>,
        serialized_key_package: Vec<u8>,
    ) -> Result<()> {
        let address = self
            .server_address
            .as_ref()
            .context("Server address is not set")?;

        // Construct the invite using their key_package
        let group_invite = self
            .manager
            .create_invite(&group_id, serialized_key_package)
            .context("Failed to create group invite")?;

        let client = reqwest::Client::new();
        let response = client
            .post(format!("{}/api/invite_user", address))
            .json(&serde_json::json!({
              "group_id": group_id.clone(),
              "sender_id": self.user_id.clone(),
              "receiver_id": receiver_id.clone(),
              "welcome_message": group_invite.welcome_message.clone(),
              "ratchet_tree": group_invite.ratchet_tree.clone(),
              "fanned": group_invite.fanned.clone(),
            }))
            .send()
            .await
            .context("Failed to send invite request")?;

        if response.status().is_success() {
            // Get group and possibly update state
            let _group = self
                .manager
                .groups
                .get_mut(&group_id)
                .context("Group not found")?;

            Ok(())
        } else {
            Err(anyhow!("Failed to send invite: {}", response.status()))
        }
    }

    pub async fn get_group_id(&self, group_name: String) -> Result<GroupId> {
        // get group where group.name == group_name:
        let (group_id, _group) = self
            .manager
            .groups
            .iter()
            .find(|(_, group)| group.name == group_name)
            .context(format!("Group not found with name: {}", group_name))?;

        Ok(group_id.clone())
    }

    pub async fn connect_to_server(&mut self, server_address: String) -> Result<()> {
        self.server_address = Some(server_address.clone());
        // use reqwest to send a POST request to the server/api/connect
        let client = reqwest::Client::new();

        // Get key package with error handling
        let key_package = self
            .manager
            .get_key_package()
            .context("Failed to get key package")?;

        let response = client
            .post(format!("{}/api/connect", server_address.clone()))
            .json(&serde_json::json!({
              "user_id": self.user_id.clone(),
              "serialized_key_package": key_package
            }))
            .send()
            .await
            .context("Failed to send connect request")?;

        if response.status().is_success() {
            Ok(())
        } else {
            Err(anyhow!(
                "Failed to connect to server: {}",
                response.status()
            ))
        }
    }

    pub async fn list_users(&mut self) -> Result<Vec<ConvoUser>> {
        let address = self
            .server_address
            .as_ref()
            .context("Server address is not set")?;

        let client = reqwest::Client::new();
        let response = client
            .get(format!("{}/api/list_users", address))
            .send()
            .await
            .context("Failed to send list_users request")?;

        let users: Vec<ConvoUser> = response
            .json()
            .await
            .context("Failed to parse response data")?;

        self.id_to_name
            .insert("system".to_string(), "system".to_string());

        Ok(users)
    }

    pub async fn process_invite(&mut self, invite: ConvoInvite) -> Result<GroupId> {
        // add the welcome_message to the manager
        let group_id = self
            .manager
            .process_invite(invite.clone())
            .context("Failed to process invite")?;

        // let the server know we have successfully processed the invite:
        let address = self
            .server_address
            .as_ref()
            .context("Server address is not set")?;

        let client = reqwest::Client::new();
        let response = client
            .post(format!("{}/api/accept_invite", address))
            .json(&serde_json::json!({
              "group_id": group_id.clone(),
              "sender_id": self.user_id.clone(),
            }))
            .send()
            .await
            .context("Failed to send accept_invite request")?;

        if !response.status().is_success() {
            bail!("Failed to accept invite: {}", response.status());
        }

        Ok(group_id)
    }

    pub async fn accept_current_invites(&mut self) -> Result<()> {
        let invites = self.manager.pending_invites.clone();
        for invite in invites {
            self.process_invite(invite).await?;
        }
        self.manager.pending_invites.clear();
        Ok(())
    }

    pub async fn check_incoming_messages(
        &mut self,
        group_id: Option<&GroupId>,
    ) -> Result<Vec<ConvoMessage>> {
        let address = self
            .server_address
            .as_ref()
            .context("Server address is not set")?;

        let mut index = 0;
        if let Some(group_id) = group_id {
            if let Some(group) = self.manager.groups.get(group_id) {
                index = group.global_index;
            }
        }

        let client = reqwest::Client::new();
        let response = client
            .post(format!("{}/api/get_new_messages", address))
            .json(&serde_json::json!({
              "group_id": group_id,
              "sender_id": self.user_id.clone(),
              "index": index,
            }))
            .send()
            .await
            .context("Failed to send get_new_messages request")?;

        // should be a Vec<ConvoMessage>
        let messages: Vec<ConvoMessage> = response
            .json()
            .await
            .context("Failed to parse response data")?;

        // exclude any messages from our own user_id:
        let messages: Vec<ConvoMessage> = messages
            .into_iter()
            .filter(|message| message.sender_id != self.user_id)
            .collect();

        self.manager
            .process_convo_messages(messages.clone(), group_id)
            .context("Failed to process messages")?;

        Ok(messages)
    }

    pub async fn get_group_index(&mut self, group_id: &GroupId) -> Result<u64> {
        let address = self
            .server_address
            .as_ref()
            .context("Server address is not set")?;

        let client = reqwest::Client::new();
        let response = client
            .post(format!("{}/api/group_index", address))
            .json(&serde_json::json!({
              "group_id": group_id.clone(),
              "sender_id": self.user_id.clone(),
            }))
            .send()
            .await
            .context("Failed to send group_index request")?;

        let group_index: u64 = response
            .json()
            .await
            .context("Failed to parse response data")?;

        Ok(group_index)
    }

    pub async fn sync_group(&mut self, group_id: &GroupId) -> Result<()> {
        // get and process any incoming messages:
        let _messages = self.check_incoming_messages(Some(group_id)).await?;

        let group_index = self.get_group_index(group_id).await?;

        // set the group_index to the group_index:
        let group = self
            .manager
            .groups
            .get_mut(group_id)
            .context(format!("Group not found for ID: {:?}", group_id))?;

        if group_index != group.global_index {
            group.global_index = group_index;
        }

        Ok(())
    }

    pub async fn send_message(&mut self, group_id: &GroupId, text: String) -> Result<()> {
        // we must always sync the group before sending a message:
        self.sync_group(group_id).await?;

        let msg = self
            .manager
            .create_message(group_id, text.clone())
            .context("Failed to create message")?;

        let mut group = self
            .manager
            .groups
            .get_mut(group_id)
            .context(format!("Group not found for ID: {:?}", group_id))?;

        let address = self
            .server_address
            .as_ref()
            .context("Server address is not set")?;

        let client = reqwest::Client::new();
        let response = client
            .post(format!("{}/api/send_message", address))
            .json(&serde_json::json!({
              "group_id": group_id,
              "sender_id": self.user_id.clone(),
              "message": msg.clone(),
              "global_index": group.global_index + 1,
            }))
            .send()
            .await
            .context("Failed to send message request")?;

        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .context("Failed to get current timestamp")?
            .as_millis() as u64;

        if response.status().is_success() {
            // add this message to our own message list:
            // increment the global_index of the group:
            group.global_index += 1;
            group.decrypted.push(MessageItem {
                text: text.clone(),
                sender_id: self.user_id.clone(),
                timestamp,
            });
            Ok(())
        } else {
            group.decrypted.push(MessageItem {
                text: "<message_failed to send!>".to_string(),
                sender_id: self.user_id.clone(),
                timestamp,
            });
            Err(anyhow!("Failed to send message: {}", response.status()))
        }
    }

    pub fn get_group_messages(&self, group_id: &GroupId) -> Result<&Vec<MessageItem>> {
        let group = self
            .manager
            .groups
            .get(group_id)
            .context(format!("Group not found for ID: {:?}", group_id))?;

        Ok(&group.decrypted)
    }

    pub fn get_renderable_messages(&self, group_id: &GroupId) -> Result<Vec<String>> {
        let messages = self.get_group_messages(group_id)?;

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
                .context(format!("Sender not found: {}", message.sender_id))?;

            display_messages.push(format!("{}: {}", sender_name, message.text));
        }

        Ok(display_messages)
    }

    pub fn print_group_messages(&self, group_id: &GroupId) -> Result<Vec<String>> {
        let messages = self.get_group_messages(group_id)?;

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
                .context(format!("Sender not found: {}", message.sender_id))?;

            let color = sender_colors
                .get(&message.sender_id)
                .context(format!("Color not found for sender: {}", message.sender_id))?;

            display_messages.push(format!(
                "{}: {}",
                sender_name.color(*color).bold(),
                message.text
            ));

            // Use the color to format the sender name, leave message plain
            println!("{}: {}", sender_name.color(*color).bold(), message.text);
        }

        Ok(display_messages)
    }

    pub fn name_to_id(&self, user_name: String) -> Result<String> {
        self.id_to_name
            .iter()
            .find(|(_, name)| **name == user_name)
            .map(|(id, _)| id.clone())
            .context(format!("User not found with name: {}", user_name))
    }
}
