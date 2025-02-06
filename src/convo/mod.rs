pub mod manager;  // change from private to public
pub use manager::ConvoManager;  // keep this re-export
pub mod server;  // public module
pub mod client;  // public module