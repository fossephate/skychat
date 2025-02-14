// src/lib.rs

pub mod convo;
pub mod utils;

// Re-export commonly used items for convenience
pub use convo::manager::ConvoManager;

// Re-export types that are used in public interfaces
pub use convo::manager::{ConvoMessage, ConvoInvite};

// parts of the code that are difficult for ffi:
pub mod web;
pub use convo::client::ConvoClient;
pub use convo::server::ConvoServer;
pub use convo::server::{ConvoUser, ConvoGroup};