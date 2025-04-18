// use skychat_core::manager::*;
use std::collections::HashMap;

use skychat_core::utils::BufferConverter;

type EncodedBase64 = String;

// Wrapper for ConvoInvite
#[derive(uniffi::Record)]
pub struct ConvoInviteWrapper {
    pub group_name: String,
    pub welcome_message: EncodedBase64, // todo: changed from Vec<u8> to String
    pub ratchet_tree: Option<Vec<u8>>,
    pub global_index: u64,
    pub fanned: Option<Vec<u8>>,
}

impl From<skychat_core::manager::ConvoInvite> for ConvoInviteWrapper {
    fn from(invite: skychat_core::manager::ConvoInvite) -> Self {
        Self {
            group_name: invite.group_name,
            welcome_message: BufferConverter::to_base64(&invite.welcome_message),
            ratchet_tree: invite.ratchet_tree,
            global_index: invite.global_index,
            fanned: invite.fanned,
        }
    }
}

impl From<ConvoInviteWrapper> for skychat_core::manager::ConvoInvite {
    fn from(wrapper: ConvoInviteWrapper) -> Self {
        Self {
            group_name: wrapper.group_name,
            welcome_message: BufferConverter::from_base64(&wrapper.welcome_message).unwrap(),
            ratchet_tree: wrapper.ratchet_tree,
            global_index: wrapper.global_index,
            fanned: wrapper.fanned,
        }
    }
}

// Wrapper for ProcessedResults
#[derive(uniffi::Record)]
pub struct ProcessedResultsWrapper {
    pub message: Option<String>,
    pub invite: Option<ConvoInviteWrapper>,
}

impl From<skychat_core::manager::ProcessedResults> for ProcessedResultsWrapper {
    fn from(results: skychat_core::manager::ProcessedResults) -> Self {
        Self {
            message: results.message,
            invite: results.invite.map(Into::into), // Convert ConvoInvite to ConvoInviteWrapper
        }
    }
}

impl From<ProcessedResultsWrapper> for skychat_core::manager::ProcessedResults {
    fn from(wrapper: ProcessedResultsWrapper) -> Self {
        Self {
            message: wrapper.message,
            invite: wrapper.invite.map(Into::into), // Convert ConvoInviteWrapper to ConvoInvite
        }
    }
}

// Wrapper for MessageItem
#[derive(uniffi::Record)]
pub struct MessageItemWrapper {
    pub text: String,
    pub sender_id: String,
    pub timestamp: u64,
}

impl From<skychat_core::manager::MessageItem> for MessageItemWrapper {
    fn from(item: skychat_core::manager::MessageItem) -> Self {
        Self {
            text: item.text,
            sender_id: item.sender_id,
            timestamp: item.timestamp,
        }
    }
}

// Add this implementation to handle references
impl From<&skychat_core::manager::MessageItem> for MessageItemWrapper {
    fn from(item: &skychat_core::manager::MessageItem) -> Self {
        Self {
            text: item.text.clone(),
            sender_id: item.sender_id.clone(),
            timestamp: item.timestamp,
        }
    }
}

// Wrapper for LocalGroup
#[derive(uniffi::Record)]
pub struct LocalGroupWrapper {
    pub name: String,
    pub global_index: u64,
    pub decrypted: Vec<MessageItemWrapper>,
}

// wrapper for SerializedCredentials
#[derive(uniffi::Record)]
pub struct SerializedCredentialsWrapper {
    pub signer: Vec<u8>,
    pub storage: HashMap<String, Vec<u8>>,
    pub group_names: Vec<String>,
    pub group_name_to_id: HashMap<String, Vec<u8>>,
    pub serialized_credential_with_key: Vec<u8>,
}

impl From<skychat_core::manager::SerializedCredentials> for SerializedCredentialsWrapper {
    fn from(state: skychat_core::manager::SerializedCredentials) -> Self {
        Self {
            signer: state.signer,
            serialized_credential_with_key: state.serialized_credential_with_key,
            storage: state.storage,
            group_names: state.group_names,
            group_name_to_id: state.group_name_to_id,
        }
    }
}

impl From<SerializedCredentialsWrapper> for skychat_core::manager::SerializedCredentials {
    fn from(wrapper: SerializedCredentialsWrapper) -> Self {
        Self {
            signer: wrapper.signer,
            serialized_credential_with_key: wrapper.serialized_credential_with_key,
            storage: wrapper.storage,
            group_names: wrapper.group_names,
            group_name_to_id: wrapper.group_name_to_id,
        }
    }
}

// Wrapper for ConvoMessage
// pub struct ConvoMessage {
//   pub global_index: u64,
//   pub sender_id: String,
//   pub unix_timestamp: u64,
//   pub message: Option<Vec<u8>>,
//   pub invite: Option<ConvoInvite>,
// }

#[derive(uniffi::Record)]
pub struct ConvoMessageWrapper {
    pub global_index: u64,
    pub unix_timestamp: u64,
    pub encrypted: Option<Vec<u8>>,
    pub invite: Option<ConvoInviteWrapper>,
}

impl From<skychat_core::manager::ConvoMessage> for ConvoMessageWrapper {
    fn from(message: skychat_core::manager::ConvoMessage) -> Self {
        Self {
            global_index: message.global_index,
            unix_timestamp: message.unix_timestamp,
            encrypted: message.encrypted,
            invite: message.invite.map(Into::into),
        }
    }
}

impl From<ConvoMessageWrapper> for skychat_core::manager::ConvoMessage {
    fn from(wrapper: ConvoMessageWrapper) -> Self {
        Self {
            global_index: wrapper.global_index,
            unix_timestamp: wrapper.unix_timestamp,
            encrypted: wrapper.encrypted,
            invite: wrapper.invite.map(Into::into),
        }
    }
}

// convo client:

// // Define wrapper types needed for FFI
// #[derive(uniffi::Record)]
// pub struct UserWrapper {
//     pub user_id: String,
//     pub name: String,
//     pub key_package: Option<Vec<u8>>,
// }

// impl From<ConvoUser> for UserWrapper {
//     fn from(user: ConvoUser) -> Self {
//         Self {
//             user_id: user.user_id,
//             name: user.name,
//             key_package: user.key_package,
//         }
//     }
// }

// Wrapper for ConvoChat

#[derive(uniffi::Record)]
pub struct ConvoChatWrapper {
    pub id: Vec<u8>,
    pub name: String,
    pub last_message: Option<String>,
    pub unread_messages: u64,
    pub global_index: u64,
    pub members: Vec<String>,
    pub decrypted: Vec<MessageItemWrapper>,
}
