// src/convo/server.rs

use crate::{convo::manager::ConvoManager, utils};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

type GroupId = Vec<u8>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConvoUser {
    pub name: String,
    pub user_id: String,
    pub serialized_key_package: Vec<u8>,
    pub last_active: u64,
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
    pub global_index: u64,
    pub sender_id: String,
    pub message: Option<Vec<u8>>,
    pub unix_timestamp: u64,
    pub invite: Option<ConvoInvite>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConvoGroup {
    pub group_id: Vec<u8>,
    pub group_name: String,
    pub global_index: u64,
    pub user_ids: Vec<String>,
    pub messages: Vec<ConvoMessage>,
}

pub struct ConvoServer {
    // groups: HashMap<String, ConvoManager>,
    pub manager: ConvoManager,
    pub users: HashMap<String, ConvoUser>,
    pub groups: HashMap<Vec<u8>, ConvoGroup>,
    pub user_specific_messages: HashMap<String, Vec<ConvoMessage>>,
}

impl ConvoServer {
    pub fn new() -> Self {
        Self {
            manager: ConvoManager::init("server".to_string()),
            users: HashMap::new(),
            groups: HashMap::new(),
            user_specific_messages: HashMap::new(),
        }
    }

    pub fn cleanup_inactive_users(&mut self) {
        let current_time = utils::current_timestamp();
        let timeout_threshold = 30; // 30 seconds timeout

        // Collect user IDs to remove
        let inactive_users: Vec<String> = self
            .users
            .iter()
            .filter(|(_, user)| current_time - user.last_active > timeout_threshold)
            .map(|(user_id, _)| user_id.clone())
            .collect();

        // // Remove inactive users from all groups
        // for group in self.groups.values_mut() {
        //     group
        //         .user_ids
        //         .retain(|user_id| !inactive_users.contains(user_id));
        // }

        // Remove from users HashMap
        for user_id in inactive_users {
            self.users.remove(&user_id);
            // self.user_specific_messages.remove(&user_id);
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
        };
        self.groups.insert(group_id, group);
    }

    pub fn client_accept_invite(&mut self, group_id: Vec<u8>, sender_id: String) {
        let group = self.groups.get_mut(&group_id).expect("Group not found");
        group.user_ids.push(sender_id.clone());

        // delete the invite from the user_specific_messages for the sender_id:
        // TODO: just delete the most recent message or more specifically the invite!:
        self.user_specific_messages.remove(&sender_id);
    }

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
                last_active: utils::current_timestamp(),
            },
        );
    }

    pub fn client_list_users(&self) -> Vec<ConvoUser> {
        self.users.values().cloned().collect()
    }

    pub fn client_get_group_index(&self, group_id: Vec<u8>, sender_id: String) -> u64 {
        let group = self.groups.get(&group_id).expect("Group not found");
        group.global_index
    }

    pub fn client_get_new_messages(
        &mut self,
        group_id: Option<GroupId>,
        sender_id: String,
        index: u64,
    ) -> Vec<ConvoMessage> {
        // Update last_active timestamp for the user
        if let Some(user) = self.users.get_mut(&sender_id) {
            user.last_active = utils::current_timestamp();
        }

        let mut new_messages: Vec<ConvoMessage> = Vec::new();
        let mut existing_messages: Vec<ConvoMessage> = Vec::new();

        if let Some(group_id) = group_id {
            let group = self.groups.get(&group_id);
            if group.is_some() {
                existing_messages = group.unwrap().messages.clone();
            }
        }

        // get the user_specific_messages for the sender_id:
        let user_specific_messages = self.user_specific_messages.get(&sender_id);

        // slice the messages and return messages >= index:
        new_messages = existing_messages.clone();
        if let Some(specific_messages) = user_specific_messages {
            new_messages.extend(specific_messages.iter().cloned());
            // delete all user_specific_messages for the sender_id since they should be processed:
            // TODO: this should ideally be acknowledged by the client somehow before deleting:
            self.user_specific_messages.remove(&sender_id);
        }

        // filter all messages with global_index >= index:
        new_messages = new_messages
            .into_iter()
            .filter(|message| message.global_index >= index)
            .collect::<Vec<ConvoMessage>>();

        // new_messages = messages.into_iter().skip(index as usize).collect::<Vec<ConvoMessage>>();

        // add the user_specific_messages to the messages:
        // new_messages.extend(user_specific_messages);

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
        fanned: Option<Vec<u8>>,
    ) {
        let mut group = self.groups.get_mut(&group_id).expect("Group not found");

        // update the group with the fanned out messages:
        if let Some(fanned) = fanned {
            group.messages.push(ConvoMessage {
                global_index: group.global_index,
                sender_id: sender_id.clone(),
                message: Some(fanned),
                unix_timestamp: 0,
                invite: None,
            });
            group.global_index += 1;
        }

        // check if the user_id already has a user_specific_messages vector:
        if !self
            .user_specific_messages
            .contains_key(&receiver_id.clone())
        {
            self.user_specific_messages
                .insert(receiver_id.clone(), Vec::new());
        }
        // add the welcome_message to the user_specific_messages vector:
        self.user_specific_messages
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

        if global_index == group.global_index {
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
            if global_index > group.global_index {
                // TODO: send a message to the client that the message is out of order
                return Err("Message is somehow too new!".to_string());
            } else {
                // TODO: send a message to the client that the message is out of order
                return Err("Message is too old! (need to sync first)".to_string());
            }
        }
    }
}
