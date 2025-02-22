use skychat_core::manager::*;

// Wrapper for ConvoInvite
#[derive(uniffi::Record)]
pub struct ConvoInviteWrapper {
    pub group_name: String,
    pub welcome_message: Vec<u8>,
    pub ratchet_tree: Option<Vec<u8>>,
    pub global_index: u64,
    pub fanned: Option<Vec<u8>>,
}

impl From<skychat_core::manager::ConvoInvite> for ConvoInviteWrapper {
    fn from(invite: skychat_core::manager::ConvoInvite) -> Self {
        Self {
            group_name: invite.group_name,
            welcome_message: invite.welcome_message,
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
            welcome_message: wrapper.welcome_message,
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
