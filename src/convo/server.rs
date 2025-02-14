// src/convo/server.rs
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::utils;

use super::manager::{ConvoInvite, ConvoMessage};

type GroupId = Vec<u8>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConvoUser {
    pub name: String,
    pub user_id: String,
    pub serialized_key_package: Vec<u8>,
    pub last_active: u64,
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
    pub users: HashMap<String, ConvoUser>,
    pub groups: HashMap<Vec<u8>, ConvoGroup>,
    pub user_specific_messages: HashMap<String, Vec<ConvoMessage>>,
}

impl ConvoServer {
    pub fn new() -> Self {
        Self {
            users: HashMap::new(),
            groups: HashMap::new(),
            user_specific_messages: HashMap::new(),
        }
    }

    pub fn cleanup_inactive_users(&mut self) -> Result<()> {
        let current_time = utils::current_timestamp();
        let timeout_threshold = 30; // 30 seconds timeout

        // Collect user IDs to remove
        let inactive_users: Vec<String> = self
            .users
            .iter()
            .filter(|(_, user)| current_time - user.last_active > timeout_threshold)
            .map(|(user_id, _)| user_id.clone())
            .collect();

        // Remove from users HashMap
        for user_id in inactive_users {
            self.users.remove(&user_id);
        }

        Ok(())
    }

    pub fn client_create_group(
        &mut self,
        group_id: Vec<u8>,
        group_name: String,
        sender_id: String,
    ) -> Result<()> {
        // Check if group exists
        if self.groups.contains_key(&group_id) {
            anyhow::bail!("Group already exists");
        }

        // Create the ConvoGroup
        let group = ConvoGroup {
            group_id: group_id.clone(),
            group_name: group_name.clone(),
            global_index: 0,
            user_ids: vec![sender_id.clone()],
            messages: Vec::new(),
        };
        
        self.groups.insert(group_id, group);
        Ok(())
    }

    pub fn client_accept_invite(&mut self, group_id: Vec<u8>, sender_id: String) -> Result<()> {
        let group = self.groups
            .get_mut(&group_id)
            .context("Group not found")?;
            
        group.user_ids.push(sender_id.clone());

        // Delete the invite from user_specific_messages
        self.user_specific_messages.remove(&sender_id);
        Ok(())
    }

    pub fn client_connect(
        &mut self,
        user_id: String,
        name: String,
        serialized_key_package: Vec<u8>,
    ) -> Result<()> {
        let timestamp = utils::current_timestamp();

        self.users.insert(
            user_id.clone(),
            ConvoUser {
                user_id: user_id.clone(),
                name,
                serialized_key_package,
                last_active: timestamp,
            },
        );
        Ok(())
    }

    pub fn client_list_users(&self) -> Vec<ConvoUser> {
        self.users.values().cloned().collect()
    }

    pub fn client_get_group_index(&self, group_id: Vec<u8>, _sender_id: String) -> Result<u64> {
        let group = self.groups
            .get(&group_id)
            .context("Group not found")?;
        Ok(group.global_index)
    }

    pub fn client_get_new_messages(
        &mut self,
        group_id: Option<GroupId>,
        sender_id: String,
        index: u64,
    ) -> Result<Vec<ConvoMessage>> {
        // Update last_active timestamp
        if let Some(user) = self.users.get_mut(&sender_id) {
            user.last_active = utils::current_timestamp();
        }

        let mut new_messages = Vec::new();

        // Get group messages if group_id provided
        if let Some(group_id) = group_id {
            if let Some(group) = self.groups.get(&group_id) {
                new_messages.extend(group.messages.clone());
            }
        }

        // Add user-specific messages
        if let Some(specific_messages) = self.user_specific_messages.get(&sender_id) {
            new_messages.extend(specific_messages.iter().cloned());
            self.user_specific_messages.remove(&sender_id);
        }

        // Filter messages by index
        new_messages.retain(|msg| msg.global_index > index);

        Ok(new_messages)
    }

    pub fn client_invite_user(
        &mut self,
        group_id: Vec<u8>,
        sender_id: String,
        receiver_id: String,
        welcome_message: Vec<u8>,
        ratchet_tree: Vec<u8>,
        fanned: Option<Vec<u8>>,
    ) -> Result<()> {
        let group = self.groups
            .get_mut(&group_id)
            .context("Group not found")?;

        // Add fanned message if provided
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

        // Create user specific messages entry if it doesn't exist
        self.user_specific_messages
            .entry(receiver_id.clone())
            .or_insert_with(Vec::new);

        // Add welcome message
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
                    welcome_message,
                    ratchet_tree: Some(ratchet_tree),
                    fanned: None,
                }),
            });
        
        group.global_index += 1;
        Ok(())
    }

    pub fn client_send_message(
        &mut self,
        group_id: Vec<u8>,
        sender_id: String,
        message: Vec<u8>,
        global_index: u64,
    ) -> Result<()> {
        let group = self.groups
            .get_mut(&group_id)
            .context("Group not found")?;
        // the proposed message's global_index must be the current group's global_index + 1:
        let correct_new_gi = group.global_index + 1;
        if global_index == correct_new_gi {
            group.messages.push(ConvoMessage {
                global_index: correct_new_gi,
                sender_id: sender_id.clone(),
                message: Some(message.clone()),
                unix_timestamp: 0,
                invite: None,
            });
            group.global_index = correct_new_gi;
            Ok(())
        } else if global_index > correct_new_gi {
            anyhow::bail!("Message is somehow too new!")
        } else {
            anyhow::bail!("Message is too old! (need to sync first)")
        }
    }
}