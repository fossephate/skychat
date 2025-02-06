// in /users/fosse/dev/skychat/src/lib.rs
pub mod convo;
pub mod utils;  // since convo.rs uses utils
pub mod server;
pub mod client;
// Re-export ConvoManager for convenience
pub use convo::ConvoManager;
pub use server::ConvoServer;