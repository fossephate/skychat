// src/convo/client.rs

use crate::convo::{manager::ConvoManager, server::{ConvoInvite, ConvoMessage, ConvoUser}};

type GroupId = Vec<u8>;
type SerializedMessage = Vec<u8>;

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

  pub async fn process_new_messages(&mut self, group_id: GroupId, messages: Vec<ConvoMessage>) {
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

  pub async fn check_incoming_messages(&mut self, group_id: GroupId) {
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

  pub async fn send_message(&mut self, group_id: GroupId, message: String) {
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

  pub fn get_group_messages(&self, group_id: GroupId) -> Vec<String> {
      let group = self.manager.groups.get(&group_id).expect("group not found");
      group.decrypted.clone()
  }
}
