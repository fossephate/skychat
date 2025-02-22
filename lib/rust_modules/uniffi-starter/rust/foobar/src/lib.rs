use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
// You must call this once
uniffi::setup_scaffolding!();

pub mod wrappers;
use crate::wrappers::*;
use skychat_core::manager::*;
use skychat_core::*;

// #[uniffi::export]
// pub fn create_skychat_manager() -> skychat_core::manager::ConvoManager {
//     let manager = skychat_core::manager::ConvoManager::new();
//     manager
// }

#[derive(uniffi::Object)]
pub struct ConvoManager {
    inner: Arc<Mutex<skychat_core::manager::ConvoManager>>,
}

type GroupId = Vec<u8>;
type GroupEpoch = Vec<u8>;

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
        group_name: String,
        welcome_message: Vec<u8>,
        ratchet_tree: Option<Vec<u8>>,
        key_package: Option<Vec<u8>>,
    ) {
        let mut inner = self.inner.lock().unwrap();
        inner.process_raw_invite(group_name, welcome_message, ratchet_tree, key_package);
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

    pub fn get_key_package(&self) -> Vec<u8> {
        let inner = self.inner.lock().unwrap();
        let key_package = inner.get_key_package();
        key_package
    }

    pub fn get_group_epoch(&self, group_id: GroupId) -> u64 {
        let mut inner = self.inner.lock().unwrap();
        let epoch = inner.get_group_epoch(&group_id);
        epoch.as_u64()
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
