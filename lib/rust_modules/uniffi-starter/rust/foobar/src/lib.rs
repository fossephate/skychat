use std::sync::{Arc, Mutex};
// use std::time::{Duration, Instant};
// You must call this once
uniffi::setup_scaffolding!();

pub mod wrappers;
use crate::wrappers::*;
use skychat_core::manager::*;
// use skychat_core::*;

use skychat_core::utils::BufferConverter;


// use skychat_client::client::*;

// #[uniffi::export]
// pub fn create_skychat_manager() -> skychat_core::manager::ConvoManager {
//     let manager = skychat_core::manager::ConvoManager::new();
//     manager
// }

// use futures::executor;
// use tokio::task;


#[derive(Debug, thiserror::Error, uniffi::Error)]
pub enum ConvoError {
    #[error("Connection error: {0}")]
    ConnectionError(String),
    #[error("Processing error: {0}")]
    ProcessingError(String),
    #[error("Generic error: {0}")]
    GenericError(String),
}

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

    pub fn get_partial_group(&self, group_id: &GroupId) -> Result<LocalGroupWrapper, ConvoError> {
        let inner = self.inner.lock().expect("Error locking inner");

        let group = inner.groups.get(group_id).expect("Error getting group");
        let group_wrapper = LocalGroupWrapper {
            name: group.name.clone(),
            global_index: group.global_index,
            decrypted: group.decrypted.iter().map(|item| item.into()).collect(),
        };
        Ok(group_wrapper)
    }

    pub fn create_group(&self, name: String) -> Result<GroupId, ConvoError> {
        let mut inner = self.inner.lock().expect("Error locking inner");

        let gid = inner.create_group(name).expect("Error creating group");
        Ok(gid)
    }

    pub fn delete_group(&self, group_id: GroupId) -> Result<(), ConvoError> {
        let mut inner = self.inner.lock().expect("Error locking inner");

        inner.delete_group(&group_id);
        Ok(())
    }

    pub fn create_invite(
        &self,
        group_id: &GroupId,
        key_package: Vec<u8>,
    ) -> Result<ConvoInviteWrapper, ConvoError> {
        let mut inner = self.inner.lock().expect("Error locking inner");

        let invite = inner
            .create_invite(group_id, key_package)
            .expect("Error creating invite");
        Ok(invite.into())
    }

    pub fn process_raw_invite(
        &self,
        sender_id: String,
        group_name: String,
        welcome_message: Vec<u8>,
        ratchet_tree: Option<Vec<u8>>,
        key_package: Option<Vec<u8>>,
    ) {
        let mut inner = self.inner.lock().expect("Error locking inner");

        inner.process_raw_invite(
            sender_id,
            group_name,
            welcome_message,
            ratchet_tree,
            key_package,
        );
    }

    pub fn create_message(&self, group_id: &GroupId, message: String) -> Result<Vec<u8>, ConvoError> {
        let mut inner = self.inner.lock().expect("Error locking inner");

        let message = inner
            .create_message(group_id, message)
            .expect("Error creating message");
        Ok(message)
    }

    pub fn process_message(
        &self,
        message: Vec<u8>,
        sender_id: Option<String>,
    ) -> Result<ProcessedResultsWrapper, ConvoError> {
        let mut inner = self.inner.lock().expect("Error locking inner");

        let results = inner
            .process_message(message, sender_id)
            .expect("Error processing message");
        Ok(results.into())
    }

    pub fn process_convo_messages(
        &self,
        messages: Vec<ConvoMessageWrapper>,
        group_id: Option<GroupId>,
    ) -> Result<(), ConvoError> {
        let mut inner = self.inner.lock().expect("Error locking inner");

        // convert Option<GroupId> to Option<&GroupId>
        let group_id_ref = group_id.as_ref();
        inner
            .process_convo_messages(
                messages.into_iter().map(|m| m.into()).collect(),
                group_id_ref,
            )
            .expect("Error processing convo messages");
        Ok(())
    }

    pub fn process_convo_messages_bin(
        &self,
        messages: Vec<EncodedBase64>,
        group_id: Option<GroupId>,
    ) -> Result<u64, ConvoError> {
        if messages.is_empty() {
            return Ok(0); // don't bother
        }

        let mut inner = self.inner.lock().expect("Error locking inner");

        // convert Option<GroupId> to Option<&GroupId>
        let group_id_ref = group_id.as_ref();
        // convert Vec<EncodedBase64> to Vec<ConvoMessage>

        // convert Vec<EncodedBase64> to Vec<ConvoMessage>
        let messages_bin: Vec<ConvoMessage> = messages
            .into_iter()
            .filter_map(
                |encoded| match BufferConverter::from_base64_json(&encoded) {
                    Ok(message) => Some(message),
                    // Err(err) => anyhow::bail!(err),
                    Err(err) => {
                        println!("Error from_base64_json: {}", err);
                        None
                    }
                },
            )
            .collect();

        inner
            .process_convo_messages(messages_bin.clone(), group_id_ref)
            .expect("Error processing convo messages");

        // return the size of the messages_bin just so we know we processed them:
        Ok(messages_bin.clone().len() as u64)
    }

    pub fn get_chats(&self) -> Result<Vec<ConvoChatWrapper>, ConvoError> {
        let mut inner = self.inner.lock().expect("Error locking inner");

        // map all groups to ConvoChatWrapper:
        let chats: Vec<ConvoChatWrapper> = inner
            .groups
            .iter()
            .map(|(group_id, group)| {
                let member_ids = inner.group_get_member_ids(&group_id).expect("Error getting member ids");
                ConvoChatWrapper {
                    id: group_id.clone(),
                    name: group.name.clone(),
                    global_index: group.global_index.clone(),
                    last_message: None,
                    unread_messages: 0,
                    members: member_ids.clone(),
                    decrypted: vec![],
                }
            })
            .collect();
        Ok(chats)
    }

    pub fn get_group_chat(&self, group_id: EncodedBase64) -> Result<ConvoChatWrapper, ConvoError> {
        let inner = self.inner.lock().expect("Error locking inner");

        let group_id_bin =
            BufferConverter::from_base64(&group_id).expect("Error b64 decoding group id");
        let group = inner
            .groups
            .get(&group_id_bin)
            .expect("Error getting group");
        let member_ids = inner
            .group_get_member_ids(&group_id_bin)
            .expect("Error getting member ids");
        let chat = ConvoChatWrapper {
            id: group.id.clone(),
            name: group.name.clone(),
            global_index: group.global_index.clone(),
            last_message: None,
            unread_messages: 0,
            members: member_ids.clone(),
            decrypted: group.decrypted.iter().map(|m| m.into()).collect(),
        };
        Ok(chat)
    }

    pub fn accept_pending_invite(&self, welcome_message: EncodedBase64) -> Result<Vec<u8>, ConvoError> {
        let mut inner = self.inner.lock().expect("Error locking inner");
        let welcome_message_bin = BufferConverter::from_base64(&welcome_message)
            .expect("Error b64 decoding welcome message");
        let res = inner
            .accept_pending_invite(welcome_message_bin)
            .expect("Error accepting pending invite");
        Ok(res)
    }

    pub fn reject_pending_invite(&self, welcome_message: Vec<u8>) -> Result<(), ConvoError> {
        let mut inner = self.inner.lock().expect("Error locking inner");

        inner
            .reject_pending_invite(welcome_message);
        Ok(())
    }

    pub fn get_key_package(&self) -> Result<Vec<u8>, ConvoError> {
        let inner = self.inner.lock().expect("Error locking inner");

        let key_package = inner.get_key_package().expect("Error getting key package");
        Ok(key_package)
    }

    pub fn group_set_index(&self, group_id: GroupId, index: u64) -> Result<(), ConvoError> {
        let mut inner = self.inner.lock().expect("Error locking inner");

        inner
            .group_set_index(&group_id, index)
            .expect("Error setting index");
        Ok(())
    }

    pub fn group_get_index(&self, group_id: GroupId) -> Result<u64, ConvoError> {
        let inner = self.inner.lock().expect("Error locking inner");

        let index = inner
            .group_get_index(&group_id)
            .expect("Error getting index");
        Ok(index)
    }

    pub fn group_get_epoch(&self, group_id: GroupId) -> Result<u64, ConvoError> {
        let mut inner = self.inner.lock().expect("Error locking inner");

        let epoch = inner
            .group_get_epoch(&group_id)
            .expect("Error getting epoch");
        Ok(epoch.as_u64())
    }

    pub fn group_push_message(
        &self,
        group_id: GroupId,
        message: String,
        sender_id: String,
    ) -> Result<(), ConvoError> {
        let mut inner = self.inner.lock().expect("Error locking inner");

        inner
            .group_push_message(&group_id, message, sender_id)
            .expect("Error pushing message");
        Ok(())
    }

    pub fn get_pending_invites(&self) -> Result<Vec<ConvoInviteWrapper>, ConvoError> {
        let inner = self.inner.lock().expect("Error locking inner");

        let invites = inner
            .pending_invites
            .iter()
            .map(|i| i.clone().into())
            .collect();
        Ok(invites)
    }

    pub fn get_group_id_with_users(&self, user_ids: Vec<String>) -> Result<EncodedBase64, ConvoError> {
        let inner = self.inner.lock().expect("Error locking inner");

        println!("user_ids: {:?}", user_ids);
        let group_id = inner
            .get_group_id_with_users(user_ids);

        if let Some(group_id) = group_id {
            let encoded_group_id = BufferConverter::to_base64(&group_id);
            Ok(encoded_group_id)
        } else {
            Err(ConvoError::GenericError("No group id found".to_string()))
        }
    }

    pub fn save_state(&self) -> Result<SerializedCredentialsWrapper, ConvoError> {
        let inner = self.inner.lock().expect("Error locking inner");

        let result = inner.save_state().expect("Error saving state");
        Ok(result.into())
    }

    pub fn load_state(&self, state: SerializedCredentialsWrapper) -> Result<(), ConvoError> {
        let mut inner = self.inner.lock().expect("Error locking inner");

        inner
            .load_state(state.into())
            .expect("Error loading state");
        Ok(())
    }

    // // this works:
    // pub async fn test_post_request(&self) -> Result<String> {
    //     // Create a new runtime
    //     let runtime = tokio::runtime::Runtime::new().expect("Failed to create Tokio runtime");

    //     // Use the runtime to execute the async block
    //     runtime.block_on(async {
    //         let server_address = "https://skychat.fosse.co";

    //         // Create client and make request
    //         let client = reqwest::Client::new();
    //         match client
    //             .post(format!("{}/api/connect", server_address))
    //             .json(&serde_json::json!({
    //                 "user_id": "test".to_string(),
    //                 "serialized_key_package": "test2".to_string()
    //             }))
    //             .send()
    //             .await
    //         {
    //             Ok(response) => {
    //                 if response.status().is_success() {
    //                     Ok("success".to_string())
    //                 } else {
    //                     Err(format!("error: HTTP status {}", response.status()))
    //                 }
    //             }
    //             Err(e) => Err(format!("error: {}", e)),
    //         }
    //     })
    // }
}

// // convo client:
// #[derive(uniffi::Object)]
// pub struct ConvoClient {
//     inner: Arc<Mutex<skychat_client::client::ConvoClient>>,
// }

// #[derive(Debug, thiserror::Error, uniffi::Error)]
// pub enum ConvoError {
//     #[error("Connection error: {0}")]
//     ConnectionError(String),
//     #[error("Processing error: {0}")]
//     ProcessingError(String),
//     // Add other error variants as needed
// }

// #[uniffi::export]
// impl ConvoClient {
//     #[uniffi::constructor]
//     pub fn new(id: String) -> Self {
//         Self {
//             inner: Arc::new(Mutex::new(skychat_client::client::ConvoClient::new(id))),
//         }
//     }

//     pub async fn connect_to_server(&self, server_address: String) -> u64 {
//         // // Release the lock before .await
//         // let client = {
//         //     let inner = self.inner.lock().unwrap();
//         //     inner.user_id.clone()
//         // };

//         // // Clone the Arc to move it into the future
//         // let inner_arc = Arc::clone(&self.inner);

//         // // Spawn a blocking task that acquires the lock
//         // let result = tokio::task::spawn_blocking(move || {
//         //     let mut client = inner_arc.lock().unwrap();
//         //     // Run the future to completion in this blocking context
//         //     futures::executor::block_on(client.connect_to_server(server_address))
//         //         .map_err(|e| ConvoError::ConnectionError(e.to_string()))
//         // }).await
//         // // .unwrap_or_else(|e| Err(format!("Task join error: {}", e)));
//         // .expect("Task join error");

//         // Create a new runtime
//         let runtime = tokio::runtime::Runtime::new().expect("Failed to create Tokio runtime");

//         // Use the runtime to execute the async block
//         runtime.block_on(async {
//             let mut client = self.inner.lock().unwrap();
//             client.connect_to_server(server_address).await;
//         });

//         return 2;
//     }

//     pub fn get_pending_invites(&self) -> Vec<ConvoInviteWrapper> {
//         let mut inner = self.inner.lock().unwrap();
//         let invites = inner
//             .manager
//             .pending_invites
//             .iter()
//             .map(|i| i.clone().into())
//             .collect();
//         invites
//     }

//     pub async fn create_group(&self, group_name: String) -> GroupId {
//         let inner_arc = Arc::clone(&self.inner);

//         // Spawn a blocking task to handle the operation
//         tokio::task::spawn_blocking(move || {
//             let mut client = inner_arc.lock().unwrap();
//             futures::executor::block_on(async {
//                 client.create_group(group_name.clone()).await;
//                 client.get_group_id(group_name).await
//             })
//         })
//         .await
//         .unwrap_or_default()
//     }

//     pub async fn get_group_id(&self, group_name: String) -> GroupId {
//         let inner_arc = Arc::clone(&self.inner);

//         tokio::task::spawn_blocking(move || {
//             let client = inner_arc.lock().unwrap();
//             futures::executor::block_on(client.get_group_id(group_name))
//         })
//         .await
//         .unwrap_or_default()
//     }

//     // pub async fn list_users(&self) -> Vec<UserWrapper> {
//     //     let inner_arc = Arc::clone(&self.inner);
//     //     tokio::task::spawn_blocking(move || {
//     //         let mut client = inner_arc.lock().unwrap();
//     //         let users = futures::executor::block_on(client.list_users());
//     //         users.into_iter().map(|u| u.into()).collect()
//     //     }).await.unwrap_or_default()
//     // }

//     // pub async fn invite_user_to_group(
//     //     &self,
//     //     receiver_id: String,
//     //     group_id: GroupId,
//     //     key_package: Vec<u8>,
//     // ) {
//     //     let inner_arc = Arc::clone(&self.inner);

//     //     tokio::task::spawn_blocking(move || {
//     //         let mut client = inner_arc.lock().unwrap();
//     //         futures::executor::block_on(
//     //             client.invite_user_to_group(receiver_id, group_id, key_package)
//     //         )
//     //     }).await.ok();
//     // }

//     // pub async fn create_group_with_users(&self, group_name: String, user_ids: Vec<String>) {
//     //     let inner_arc = Arc::clone(&self.inner);

//     //     tokio::task::spawn_blocking(move || {
//     //         let mut client = inner_arc.lock().unwrap();
//     //         futures::executor::block_on(client.create_group_with_users(group_name, user_ids))
//     //     }).await.ok();
//     // }

//     // pub async fn process_invite(&self, invite: ConvoInviteWrapper) {
//     //     let inner_arc = Arc::clone(&self.inner);

//     //     tokio::task::spawn_blocking(move || {
//     //         let mut client = inner_arc.lock().unwrap();
//     //         futures::executor::block_on(client.process_invite(invite.into()))
//     //     }).await.ok();
//     // }

//     // pub async fn accept_current_invites(&self) {
//     //     let inner_arc = Arc::clone(&self.inner);

//     //     tokio::task::spawn_blocking(move || {
//     //         let mut client = inner_arc.lock().unwrap();
//     //         futures::executor::block_on(client.accept_current_invites())
//     //     }).await.ok();
//     // }

//     // pub async fn check_incoming_messages(
//     //     &self,
//     //     group_id: Option<GroupId>,
//     // ) -> Vec<ConvoMessageWrapper> {
//     //     let inner_arc = Arc::clone(&self.inner);

//     //     tokio::task::spawn_blocking(move || {
//     //         let mut client = inner_arc.lock().unwrap();
//     //         let group_id_ref = group_id.as_ref();
//     //         let messages = futures::executor::block_on(client.check_incoming_messages(group_id_ref));
//     //         messages.into_iter().map(|m| m.into()).collect()
//     //     }).await.unwrap_or_default()
//     // }

//     // pub async fn get_group_index(&self, group_id: GroupId) -> u64 {
//     //     let inner_arc = Arc::clone(&self.inner);

//     //     tokio::task::spawn_blocking(move || {
//     //         let mut client = inner_arc.lock().unwrap();
//     //         futures::executor::block_on(client.get_group_index(&group_id))
//     //     }).await.unwrap_or_default()
//     // }

//     // pub async fn sync_group(&self, group_id: GroupId) {
//     //     let inner_arc = Arc::clone(&self.inner);

//     //     tokio::task::spawn_blocking(move || {
//     //         let mut client = inner_arc.lock().unwrap();
//     //         futures::executor::block_on(client.sync_group(&group_id))
//     //     }).await.ok();
//     // }

//     // pub async fn send_message(&self, group_id: GroupId, text: String) {
//     //     let inner_arc = Arc::clone(&self.inner);

//     //     tokio::task::spawn_blocking(move || {
//     //         let mut client = inner_arc.lock().unwrap();
//     //         futures::executor::block_on(client.send_message(&group_id, text))
//     //     }).await.ok();
//     // }

//     // pub fn get_group_messages(&self, group_id: GroupId) -> Vec<MessageItemWrapper> {
//     //     let inner = self.inner.lock().unwrap();
//     //     let messages = inner.get_group_messages(&group_id);
//     //     messages.iter().map(|m| m.into()).collect()
//     // }

//     // pub fn get_renderable_messages(&self, group_id: GroupId) -> Vec<String> {
//     //     let inner = self.inner.lock().unwrap();
//     //     inner.get_renderable_messages(&group_id)
//     // }

//     // pub fn name_to_id(&self, user_name: String) -> String {
//     //     let inner = self.inner.lock().unwrap();
//     //     inner.name_to_id(user_name)
//     // }

//     // pub fn save_state(&self) -> SerializedCredentialsWrapper {
//     //     let inner = self.inner.lock().unwrap();
//     //     inner.manager.save_state().into()
//     // }

//     // pub fn load_state(&self, state: SerializedCredentialsWrapper) {
//     //     let mut inner = self.inner.lock().unwrap();
//     //     inner.manager.load_state(state.into());
//     // }
// }

// // // examples / testing:

// // #[derive(Debug, PartialEq, uniffi::Enum)]
// // pub enum ComputationState {
// //     /// Initial state with no value computed
// //     Init,
// //     Computed {
// //         result: ComputationResult,
// //     },
// // }

// // #[derive(Copy, Clone, Debug, PartialEq, uniffi::Record)]
// // pub struct ComputationResult {
// //     pub value: i64,
// //     pub computation_time: Duration,
// // }

// // #[derive(Debug, PartialEq, thiserror::Error, uniffi::Error)]
// // pub enum ComputationError {
// //     #[error("Division by zero is not allowed.")]
// //     DivisionByZero,
// //     #[error("Result overflowed the numeric type bounds.")]
// //     Overflow,
// //     #[error("There is no existing computation state, so you cannot perform this operation.")]
// //     IllegalComputationWithInitState,
// // }

// // /// A binary operator that performs some mathematical operation with two numbers.
// // #[uniffi::export(with_foreign)]
// // pub trait BinaryOperator: Send + Sync {
// //     fn perform(&self, lhs: i64, rhs: i64) -> Result<i64, ComputationError>;
// // }

// // /// A somewhat silly demonstration of functional core/imperative shell in the form of a calculator with arbitrary operators.
// // ///
// // /// Operations return a new calculator with updated internal state reflecting the computation.
// // #[derive(PartialEq, Debug, uniffi::Object)]
// // pub struct Calculator {
// //     state: ComputationState,
// // }

// // #[uniffi::export]
// // impl Calculator {
// //     #[uniffi::constructor]
// //     pub fn new() -> Self {
// //         Self {
// //             state: ComputationState::Init,
// //         }
// //     }

// //     pub fn last_result(&self) -> Option<ComputationResult> {
// //         match self.state {
// //             ComputationState::Init => None,
// //             ComputationState::Computed { result } => Some(result),
// //         }
// //     }

// //     /// Performs a calculation using the supplied binary operator and operands.
// //     pub fn calculate(
// //         &self,
// //         op: Arc<dyn BinaryOperator>,
// //         lhs: i64,
// //         rhs: i64,
// //     ) -> Result<Calculator, ComputationError> {
// //         let start = Instant::now();
// //         let value = op.perform(lhs, rhs)?;

// //         Ok(Calculator {
// //             state: ComputationState::Computed {
// //                 result: ComputationResult {
// //                     value,
// //                     computation_time: start.elapsed(),
// //                 },
// //             },
// //         })
// //     }

// //     /// Performs a calculation using the supplied binary operator, the last computation result, and the supplied operand.
// //     ///
// //     /// The supplied operand will be the right-hand side in the mathematical operation.
// //     pub fn calculate_more(
// //         &self,
// //         op: Arc<dyn BinaryOperator>,
// //         rhs: i64,
// //     ) -> Result<Calculator, ComputationError> {
// //         let ComputationState::Computed { result } = &self.state else {
// //             return Err(ComputationError::IllegalComputationWithInitState);
// //         };

// //         let start = Instant::now();
// //         let value = op.perform(result.value, rhs)?;

// //         Ok(Calculator {
// //             state: ComputationState::Computed {
// //                 result: ComputationResult {
// //                     value,
// //                     computation_time: start.elapsed(),
// //                 },
// //             },
// //         })
// //     }
// // }

// // #[derive(uniffi::Object)]
// // struct SafeAddition {}

// // // Makes it easy to construct from foreign code
// // #[uniffi::export]
// // impl SafeAddition {
// //     #[uniffi::constructor]
// //     fn new() -> Self {
// //         SafeAddition {}
// //     }
// // }

// // #[uniffi::export]
// // impl BinaryOperator for SafeAddition {
// //     fn perform(&self, lhs: i64, rhs: i64) -> Result<i64, ComputationError> {
// //         lhs.checked_add(rhs).ok_or(ComputationError::Overflow)
// //     }
// // }

// // #[derive(uniffi::Object)]
// // struct SafeDivision {}

// // // Makes it easy to construct from foreign code
// // #[uniffi::export]
// // impl SafeDivision {
// //     #[uniffi::constructor]
// //     fn new() -> Self {
// //         SafeDivision {}
// //     }
// // }

// // #[uniffi::export]
// // impl BinaryOperator for SafeDivision {
// //     fn perform(&self, lhs: i64, rhs: i64) -> Result<i64, ComputationError> {
// //         if rhs == 0 {
// //             Err(ComputationError::DivisionByZero)
// //         } else {
// //             lhs.checked_div(rhs).ok_or(ComputationError::Overflow)
// //         }
// //     }
// // }

// // // Helpers that only exist because the concrete objects above DO NOT have the requisite protocol conformances
// // // stated in the glue code. It's easy to extend classes in Swift, but you can't just declare a conformance in Kotlin.
// // // So, to keep things easy, we just do this as a compromise.

// // #[uniffi::export]
// // fn safe_addition_operator() -> Arc<dyn BinaryOperator> {
// //     Arc::new(SafeAddition::new())
// // }

// // #[uniffi::export]
// // fn safe_division_operator() -> Arc<dyn BinaryOperator> {
// //     Arc::new(SafeDivision::new())
// // }

// // #[cfg(test)]
// // mod tests {
// //     use super::*;

// //     #[test]
// //     fn addition() {
// //         let calc = Calculator::new();
// //         let op = Arc::new(SafeAddition {});

// //         let calc = calc
// //             .calculate(op.clone(), 2, 2)
// //             .expect("Something went wrong");
// //         assert_eq!(calc.last_result().unwrap().value, 4);

// //         assert_eq!(
// //             calc.calculate_more(op.clone(), i64::MAX),
// //             Err(ComputationError::Overflow)
// //         );
// //         assert_eq!(
// //             calc.calculate_more(op, 8)
// //                 .unwrap()
// //                 .last_result()
// //                 .unwrap()
// //                 .value,
// //             12
// //         );
// //     }

// //     #[test]
// //     fn division() {
// //         let calc = Calculator::new();
// //         let op = Arc::new(SafeDivision {});

// //         let calc = calc
// //             .calculate(op.clone(), 2, 2)
// //             .expect("Something went wrong");
// //         assert_eq!(calc.last_result().unwrap().value, 1);

// //         assert_eq!(
// //             calc.calculate_more(op.clone(), 0),
// //             Err(ComputationError::DivisionByZero)
// //         );
// //         assert_eq!(
// //             calc.calculate(op, i64::MIN, -1),
// //             Err(ComputationError::Overflow)
// //         );
// //     }

// //     #[test]
// //     fn compute_more_from_init_state() {
// //         let calc = Calculator::new();
// //         let op = Arc::new(SafeAddition {});

// //         assert_eq!(
// //             calc.calculate_more(op, 1),
// //             Err(ComputationError::IllegalComputationWithInitState)
// //         );
// //     }
// // }
