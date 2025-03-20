use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
// You must call this once
uniffi::setup_scaffolding!();

pub mod wrappers;
use crate::wrappers::*;
use skychat_core::manager::*;
use skychat_core::*;

use skychat_core::utils::BufferConverter;

// use skychat_client::*;  // Remove or comment this line
use skychat_client::client::*;
// use skychat_client::*;  // Remove or comment this line

// #[uniffi::export]
// pub fn create_skychat_manager() -> skychat_core::manager::ConvoManager {
//     let manager = skychat_core::manager::ConvoManager::new();
//     manager
// }

use tokio::task;
use futures::executor;

#[derive(uniffi::Object)]
pub struct ConvoManager {
    inner: Arc<Mutex<skychat_core::manager::ConvoManager>>,
}

type GroupId = Vec<u8>;
type GroupEpoch = Vec<u8>;
type EncodedBase64 = String;

#[uniffi::export]
impl ConvoManager {
    #[uniffi::constructor]
    pub fn new(name: String) -> Self {
        Self {
            inner: Arc::new(Mutex::new(skychat_core::manager::ConvoManager::init(name))),
        }
    }

    pub fn get_partial_group(&self, group_id: &GroupId) -> LocalGroupWrapper {
        let mut inner = self.inner.lock().unwrap();
        let group = inner.groups.get(group_id).unwrap();
        LocalGroupWrapper {
            name: group.name.clone(),
            global_index: group.global_index,
            decrypted: group.decrypted.iter().map(|item| item.into()).collect(),
        }
    }

    pub fn create_new_group(&self, name: String) -> GroupId {
        let mut inner = self.inner.lock().unwrap();
        let gid = inner.create_new_group(name);
        gid
    }

    pub fn create_invite(&self, group_id: &GroupId, key_package: Vec<u8>) -> ConvoInviteWrapper {
        let mut inner = self.inner.lock().unwrap();
        let invite = inner.create_invite(group_id, key_package);
        invite.into() // Use From/Into trait
    }

    pub fn process_raw_invite(
        &self,
        sender_id: String,
        group_name: String,
        welcome_message: Vec<u8>,
        ratchet_tree: Option<Vec<u8>>,
        key_package: Option<Vec<u8>>,
    ) {
        let mut inner = self.inner.lock().unwrap();
        inner.process_raw_invite(
            sender_id,
            group_name,
            welcome_message,
            ratchet_tree,
            key_package,
        );
    }

    pub fn create_message(&self, group_id: &GroupId, message: String) -> Vec<u8> {
        let mut inner = self.inner.lock().unwrap();
        let message = inner.create_message(group_id, message);
        message
    }

    pub fn process_message(
        &self,
        message: Vec<u8>,
        sender_id: Option<String>,
    ) -> ProcessedResultsWrapper {
        let mut inner = self.inner.lock().unwrap();
        let results = inner.process_message(message, sender_id);
        results.into() // Use From/Into trait
    }

    pub fn process_convo_messages(
        &self,
        messages: Vec<ConvoMessageWrapper>,
        group_id: Option<GroupId>,
    ) {
        let mut inner = self.inner.lock().unwrap();

        // convert Option<GroupId> to Option<&GroupId>
        let group_id_ref = group_id.as_ref();
        inner.process_convo_messages(
            messages.into_iter().map(|m| m.into()).collect(),
            group_id_ref,
        );
    }

    pub fn process_convo_messages_bin(
        &self,
        messages: Vec<EncodedBase64>,
        group_id: Option<GroupId>,
    ) -> u64 {
        let mut inner = self.inner.lock().unwrap();

        // convert Option<GroupId> to Option<&GroupId>
        let group_id_ref = group_id.as_ref();
        // convert Vec<EncodedBase64> to Vec<ConvoMessage>

        // convert Vec<EncodedBase64> to Vec<ConvoMessage>
        let messages_bin: Vec<ConvoMessage> = messages
            .into_iter()
            .filter_map(|encoded| {
                match BufferConverter::from_base64_json(&encoded) {
                    Ok(message) => Some(message),
                    Err(err) => {
                        // You might want to log the error in a real application
                        // println!("Failed to decode message: {}", err);
                        None
                    }
                }
            })
            .collect();

        inner.process_convo_messages(messages_bin.clone(), group_id_ref);

        // return the size of the messages_bin just so we know we processed them:
        messages_bin.clone().len() as u64
    }

    pub fn accept_pending_invite(&self, welcome_message: Vec<u8>) -> Vec<u8> {
        let mut inner = self.inner.lock().unwrap();
        inner.accept_pending_invite(welcome_message)
    }

    pub fn reject_pending_invite(&self, welcome_message: Vec<u8>) {
        let mut inner = self.inner.lock().unwrap();
        inner.reject_pending_invite(welcome_message);
    }

    pub fn get_key_package(&self) -> Vec<u8> {
        let inner = self.inner.lock().unwrap();
        let key_package = inner.get_key_package();
        key_package
    }

    pub fn save_state(&self) -> SerializedCredentialsWrapper {
        let mut inner = self.inner.lock().unwrap();
        let state = inner.save_state();
        state.into()
    }

    pub fn load_state(&self, state: SerializedCredentialsWrapper) {
        let mut inner = self.inner.lock().unwrap();
        inner.load_state(state.into());
    }

    pub fn group_set_index(&self, group_id: GroupId, index: u64) {
        let mut inner = self.inner.lock().unwrap();
        inner.group_set_index(&group_id, index);
    }

    pub fn group_get_index(&self, group_id: GroupId) -> u64 {
        let mut inner = self.inner.lock().unwrap();
        inner.group_get_index(&group_id)
    }

    pub fn group_get_epoch(&self, group_id: GroupId) -> u64 {
        let mut inner = self.inner.lock().unwrap();
        let epoch = inner.group_get_epoch(&group_id);
        epoch.as_u64()
    }

    pub fn group_push_message(&self, group_id: GroupId, message: String, sender_id: String) {
        let mut inner = self.inner.lock().unwrap();
        inner.group_push_message(&group_id, message, sender_id);
    }

    pub fn get_pending_invites(&self) -> Vec<ConvoInviteWrapper> {
        let mut inner = self.inner.lock().unwrap();
        let invites = inner
            .pending_invites
            .iter()
            .map(|i| i.clone().into())
            .collect();
        invites
    }
}

// convo client:
#[derive(uniffi::Object)]
pub struct ConvoClient {
    inner: Arc<Mutex<skychat_client::client::ConvoClient>>,
}

#[uniffi::export]
impl ConvoClient {
  #[uniffi::constructor]
  pub fn new(id: String) -> Self {
      Self {
          inner: Arc::new(Mutex::new(skychat_client::client::ConvoClient::new(id))),
      }
  }

  pub async fn connect_to_server(&self, server_address: String) -> Result<(), String> {
    // Release the lock before .await
    let client = {
        let inner = self.inner.lock().unwrap();
        inner.user_id.clone()
    };

    // Clone the Arc to move it into the future
    let inner_arc = Arc::clone(&self.inner);

    // Spawn a blocking task that acquires the lock
    let result = tokio::task::spawn_blocking(move || {
        let mut client = inner_arc.lock().unwrap();
        // Run the future to completion in this blocking context
        futures::executor::block_on(client.connect_to_server(server_address))
            .map_err(|e| e.to_string()) // Convert the error to String
    }).await
    .unwrap_or_else(|e| Err(format!("Task join error: {}", e)));

    result
  }

  pub fn get_pending_invites(&self) -> Vec<ConvoInviteWrapper> {
    let mut inner = self.inner.lock().unwrap();
    let invites = inner
        .manager
        .pending_invites
        .iter()
        .map(|i| i.clone().into())
        .collect();
    invites
  }

  pub async fn create_group(&self, group_name: String) -> GroupId {
      let inner_arc = Arc::clone(&self.inner);

      // Spawn a blocking task to handle the operation
      tokio::task::spawn_blocking(move || {
          let mut client = inner_arc.lock().unwrap();
          futures::executor::block_on(async {
              client.create_group(group_name.clone()).await;
              client.get_group_id(group_name).await
          })
      }).await.unwrap_or_default()
  }

  pub async fn get_group_id(&self, group_name: String) -> GroupId {
      let inner_arc = Arc::clone(&self.inner);

      tokio::task::spawn_blocking(move || {
          let client = inner_arc.lock().unwrap();
          futures::executor::block_on(client.get_group_id(group_name))
      }).await.unwrap_or_default()
  }

  // pub async fn list_users(&self) -> Vec<UserWrapper> {
  //     let inner_arc = Arc::clone(&self.inner);
  //     tokio::task::spawn_blocking(move || {
  //         let mut client = inner_arc.lock().unwrap();
  //         let users = futures::executor::block_on(client.list_users());
  //         users.into_iter().map(|u| u.into()).collect()
  //     }).await.unwrap_or_default()
  // }

  pub async fn invite_user_to_group(
      &self,
      receiver_id: String,
      group_id: GroupId,
      key_package: Vec<u8>,
  ) {
      let inner_arc = Arc::clone(&self.inner);

      tokio::task::spawn_blocking(move || {
          let mut client = inner_arc.lock().unwrap();
          futures::executor::block_on(
              client.invite_user_to_group(receiver_id, group_id, key_package)
          )
      }).await.ok();
  }

  pub async fn create_group_with_users(&self, group_name: String, user_ids: Vec<String>) {
      let inner_arc = Arc::clone(&self.inner);

      tokio::task::spawn_blocking(move || {
          let mut client = inner_arc.lock().unwrap();
          futures::executor::block_on(client.create_group_with_users(group_name, user_ids))
      }).await.ok();
  }

  pub async fn process_invite(&self, invite: ConvoInviteWrapper) {
      let inner_arc = Arc::clone(&self.inner);

      tokio::task::spawn_blocking(move || {
          let mut client = inner_arc.lock().unwrap();
          futures::executor::block_on(client.process_invite(invite.into()))
      }).await.ok();
  }

  pub async fn accept_current_invites(&self) {
      let inner_arc = Arc::clone(&self.inner);

      tokio::task::spawn_blocking(move || {
          let mut client = inner_arc.lock().unwrap();
          futures::executor::block_on(client.accept_current_invites())
      }).await.ok();
  }

  pub async fn check_incoming_messages(
      &self,
      group_id: Option<GroupId>,
  ) -> Vec<ConvoMessageWrapper> {
      let inner_arc = Arc::clone(&self.inner);

      tokio::task::spawn_blocking(move || {
          let mut client = inner_arc.lock().unwrap();
          let group_id_ref = group_id.as_ref();
          let messages = futures::executor::block_on(client.check_incoming_messages(group_id_ref));
          messages.into_iter().map(|m| m.into()).collect()
      }).await.unwrap_or_default()
  }

  pub async fn get_group_index(&self, group_id: GroupId) -> u64 {
      let inner_arc = Arc::clone(&self.inner);

      tokio::task::spawn_blocking(move || {
          let mut client = inner_arc.lock().unwrap();
          futures::executor::block_on(client.get_group_index(&group_id))
      }).await.unwrap_or_default()
  }

  pub async fn sync_group(&self, group_id: GroupId) {
      let inner_arc = Arc::clone(&self.inner);

      tokio::task::spawn_blocking(move || {
          let mut client = inner_arc.lock().unwrap();
          futures::executor::block_on(client.sync_group(&group_id))
      }).await.ok();
  }

  pub async fn send_message(&self, group_id: GroupId, text: String) {
      let inner_arc = Arc::clone(&self.inner);

      tokio::task::spawn_blocking(move || {
          let mut client = inner_arc.lock().unwrap();
          futures::executor::block_on(client.send_message(&group_id, text))
      }).await.ok();
  }

  pub fn get_group_messages(&self, group_id: GroupId) -> Vec<MessageItemWrapper> {
      let inner = self.inner.lock().unwrap();
      let messages = inner.get_group_messages(&group_id);
      messages.iter().map(|m| m.into()).collect()
  }

  pub fn get_renderable_messages(&self, group_id: GroupId) -> Vec<String> {
      let inner = self.inner.lock().unwrap();
      inner.get_renderable_messages(&group_id)
  }

  pub fn name_to_id(&self, user_name: String) -> String {
      let inner = self.inner.lock().unwrap();
      inner.name_to_id(user_name)
  }

  pub fn save_state(&self) -> SerializedCredentialsWrapper {
      let inner = self.inner.lock().unwrap();
      inner.manager.save_state().into()
  }

  pub fn load_state(&self, state: SerializedCredentialsWrapper) {
      let mut inner = self.inner.lock().unwrap();
      inner.manager.load_state(state.into());
  }
}

// // examples / testing:

// #[derive(Debug, PartialEq, uniffi::Enum)]
// pub enum ComputationState {
//     /// Initial state with no value computed
//     Init,
//     Computed {
//         result: ComputationResult,
//     },
// }

// #[derive(Copy, Clone, Debug, PartialEq, uniffi::Record)]
// pub struct ComputationResult {
//     pub value: i64,
//     pub computation_time: Duration,
// }

// #[derive(Debug, PartialEq, thiserror::Error, uniffi::Error)]
// pub enum ComputationError {
//     #[error("Division by zero is not allowed.")]
//     DivisionByZero,
//     #[error("Result overflowed the numeric type bounds.")]
//     Overflow,
//     #[error("There is no existing computation state, so you cannot perform this operation.")]
//     IllegalComputationWithInitState,
// }

// /// A binary operator that performs some mathematical operation with two numbers.
// #[uniffi::export(with_foreign)]
// pub trait BinaryOperator: Send + Sync {
//     fn perform(&self, lhs: i64, rhs: i64) -> Result<i64, ComputationError>;
// }

// /// A somewhat silly demonstration of functional core/imperative shell in the form of a calculator with arbitrary operators.
// ///
// /// Operations return a new calculator with updated internal state reflecting the computation.
// #[derive(PartialEq, Debug, uniffi::Object)]
// pub struct Calculator {
//     state: ComputationState,
// }

// #[uniffi::export]
// impl Calculator {
//     #[uniffi::constructor]
//     pub fn new() -> Self {
//         Self {
//             state: ComputationState::Init,
//         }
//     }

//     pub fn last_result(&self) -> Option<ComputationResult> {
//         match self.state {
//             ComputationState::Init => None,
//             ComputationState::Computed { result } => Some(result),
//         }
//     }

//     /// Performs a calculation using the supplied binary operator and operands.
//     pub fn calculate(
//         &self,
//         op: Arc<dyn BinaryOperator>,
//         lhs: i64,
//         rhs: i64,
//     ) -> Result<Calculator, ComputationError> {
//         let start = Instant::now();
//         let value = op.perform(lhs, rhs)?;

//         Ok(Calculator {
//             state: ComputationState::Computed {
//                 result: ComputationResult {
//                     value,
//                     computation_time: start.elapsed(),
//                 },
//             },
//         })
//     }

//     /// Performs a calculation using the supplied binary operator, the last computation result, and the supplied operand.
//     ///
//     /// The supplied operand will be the right-hand side in the mathematical operation.
//     pub fn calculate_more(
//         &self,
//         op: Arc<dyn BinaryOperator>,
//         rhs: i64,
//     ) -> Result<Calculator, ComputationError> {
//         let ComputationState::Computed { result } = &self.state else {
//             return Err(ComputationError::IllegalComputationWithInitState);
//         };

//         let start = Instant::now();
//         let value = op.perform(result.value, rhs)?;

//         Ok(Calculator {
//             state: ComputationState::Computed {
//                 result: ComputationResult {
//                     value,
//                     computation_time: start.elapsed(),
//                 },
//             },
//         })
//     }
// }

// #[derive(uniffi::Object)]
// struct SafeAddition {}

// // Makes it easy to construct from foreign code
// #[uniffi::export]
// impl SafeAddition {
//     #[uniffi::constructor]
//     fn new() -> Self {
//         SafeAddition {}
//     }
// }

// #[uniffi::export]
// impl BinaryOperator for SafeAddition {
//     fn perform(&self, lhs: i64, rhs: i64) -> Result<i64, ComputationError> {
//         lhs.checked_add(rhs).ok_or(ComputationError::Overflow)
//     }
// }

// #[derive(uniffi::Object)]
// struct SafeDivision {}

// // Makes it easy to construct from foreign code
// #[uniffi::export]
// impl SafeDivision {
//     #[uniffi::constructor]
//     fn new() -> Self {
//         SafeDivision {}
//     }
// }

// #[uniffi::export]
// impl BinaryOperator for SafeDivision {
//     fn perform(&self, lhs: i64, rhs: i64) -> Result<i64, ComputationError> {
//         if rhs == 0 {
//             Err(ComputationError::DivisionByZero)
//         } else {
//             lhs.checked_div(rhs).ok_or(ComputationError::Overflow)
//         }
//     }
// }

// // Helpers that only exist because the concrete objects above DO NOT have the requisite protocol conformances
// // stated in the glue code. It's easy to extend classes in Swift, but you can't just declare a conformance in Kotlin.
// // So, to keep things easy, we just do this as a compromise.

// #[uniffi::export]
// fn safe_addition_operator() -> Arc<dyn BinaryOperator> {
//     Arc::new(SafeAddition::new())
// }

// #[uniffi::export]
// fn safe_division_operator() -> Arc<dyn BinaryOperator> {
//     Arc::new(SafeDivision::new())
// }

// #[cfg(test)]
// mod tests {
//     use super::*;

//     #[test]
//     fn addition() {
//         let calc = Calculator::new();
//         let op = Arc::new(SafeAddition {});

//         let calc = calc
//             .calculate(op.clone(), 2, 2)
//             .expect("Something went wrong");
//         assert_eq!(calc.last_result().unwrap().value, 4);

//         assert_eq!(
//             calc.calculate_more(op.clone(), i64::MAX),
//             Err(ComputationError::Overflow)
//         );
//         assert_eq!(
//             calc.calculate_more(op, 8)
//                 .unwrap()
//                 .last_result()
//                 .unwrap()
//                 .value,
//             12
//         );
//     }

//     #[test]
//     fn division() {
//         let calc = Calculator::new();
//         let op = Arc::new(SafeDivision {});

//         let calc = calc
//             .calculate(op.clone(), 2, 2)
//             .expect("Something went wrong");
//         assert_eq!(calc.last_result().unwrap().value, 1);

//         assert_eq!(
//             calc.calculate_more(op.clone(), 0),
//             Err(ComputationError::DivisionByZero)
//         );
//         assert_eq!(
//             calc.calculate(op, i64::MIN, -1),
//             Err(ComputationError::Overflow)
//         );
//     }

//     #[test]
//     fn compute_more_from_init_state() {
//         let calc = Calculator::new();
//         let op = Arc::new(SafeAddition {});

//         assert_eq!(
//             calc.calculate_more(op, 1),
//             Err(ComputationError::IllegalComputationWithInitState)
//         );
//     }
// }
