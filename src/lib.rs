// src/lib.rs

pub mod convo;
pub mod web;
pub mod utils;

// Re-export commonly used items for convenience
pub use convo::manager::ConvoManager;
pub use convo::server::ConvoServer;
pub use convo::client::ConvoClient;

// Re-export types that are used in public interfaces
pub use convo::server::{ConvoMessage, ConvoUser, ConvoGroup, ConvoInvite};