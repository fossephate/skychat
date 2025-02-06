// src/main.rs

#[macro_use]
extern crate rocket;

use colored::*;
use rand::Rng;
use rocket::{fs::Options, Config};
use std::sync::Mutex;

pub mod convo;
pub mod server;
pub mod client;

use convo::ConvoManager;
use server::*;
use client::*;
pub mod utils;
use std::env;
pub mod web;
use web::*;

async fn client() -> Result<(), Box<dyn std::error::Error>> {
    println!("\n<------ Hello, world! ------->\n");

    // create alice and bob:
    let mut alice = ConvoManager::init("alice".to_string());
    let mut bob = ConvoManager::init("bob".to_string());
    let gn = "alice_group".to_string();

    // alice creates a new group and invites bob:
    let gid = alice.create_new_group(gn.clone());
    let group_invite = alice.create_invite(gid.clone(), bob.get_key_package());
    bob.process_invite(gn.clone(), group_invite.welcome, group_invite.ratchet_tree);

    println!("<------ Alice creates a new group and invites Bob! ------->");

    // bob sends a message to alice:
    let message_text = "Hello, alice!".to_string();
    println!("{}", format!("Bob: {}", message_text).blue());
    let serialized_message = bob.create_message(gid.clone(), message_text);
    let processed_results = alice.process_incoming_message(gid.clone(), serialized_message);
    println!(
        "{}",
        format!("Alice decrypted: {}", processed_results.message.unwrap()).green()
    );

    // alice sends a message to bob:
    let message_text = "Hello, bob!".to_string();
    println!("{}", format!("Alice: {}", message_text).red());
    let serialized_message = alice.create_message(gid.clone(), message_text);
    let processed_results = bob.process_incoming_message(gid.clone(), serialized_message);
    println!(
        "{}",
        format!("Bob decrypted: {}", processed_results.message.unwrap()).green()
    );

    // charlie is created:
    let mut charlie = ConvoManager::init("charlie".to_string());
    // and bob invites charlie:
    let group_invite = bob.create_invite(gid.clone(), charlie.get_key_package());

    // charlie + everyone* (not actually everyone, but I think log(n) people in the tree?)
    // must process the invite before any new messages can be decrypted
    // (excluding bob since he created the invite)
    charlie.process_invite(gn.clone(), group_invite.welcome, group_invite.ratchet_tree);
    // everyone* else must processes the fanned commit like a normal message
    alice.process_incoming_message(gid.clone(), group_invite.fanned);

    println!("\n<------ Charlie enters the group! ------->");

    // charlie, now in the group, sends a message:
    let message_text = "Hello, everyone!".to_string();
    println!("{}", format!("Charlie: {}", message_text).yellow());
    let serialized_message = charlie.create_message(gid.clone(), message_text);

    // alice decrypts the message:
    let processed_results = alice.process_incoming_message(gid.clone(), serialized_message.clone());
    println!(
        "{}",
        format!("Alice decrypted: {}", processed_results.message.unwrap()).green()
    );

    // bob decrypts the message:
    let processed_results = bob.process_incoming_message(gid.clone(), serialized_message.clone());
    println!(
        "{}",
        format!("Bob decrypted: {}", processed_results.message.unwrap()).green()
    );

    // bob responds:
    let message_text = "Welcome, charlie!".to_string();
    println!("{}", format!("Bob: {}", message_text).blue());
    let serialized_message = bob.create_message(gid.clone(), message_text);
    // charlie and alice decrypt the message:
    let processed_results = alice.process_incoming_message(gid.clone(), serialized_message.clone());
    println!(
        "{}",
        format!("Alice decrypted: {}", processed_results.message.unwrap()).green()
    );
    let processed_results =
        charlie.process_incoming_message(gid.clone(), serialized_message.clone());
    println!(
        "{}",
        format!("Charlie decrypted: {}", processed_results.message.unwrap()).green()
    );

    println!("\n<------ Charlie kicks Alice out of the group! ------->");
    // charlie kicks alice out of the group!:
    let (fanned, welcome_option) = charlie.kick_member(gid.clone(), alice.get_key_package());

    // bob processes the fanned commit:
    bob.process_incoming_message(gid.clone(), fanned.clone());

    // charlie sends a message (to now just bob):
    let message_text = "Hello, (just) bob!".to_string();
    println!("{}", format!("Charlie: {}", message_text).yellow());
    let serialized_message = charlie.create_message(gid.clone(), message_text);

    // bob decrypts the message:
    let processed_results = bob.process_incoming_message(gid.clone(), serialized_message.clone());
    println!(
        "{}",
        format!("Bob decrypted: {}", processed_results.message.unwrap()).green()
    );

    // // david requests to join the group:
    // let mut david = ConvoManager::init("david".to_string());
    // println!("<------ David created! ------->");
    // let (epoch, group_id) = charlie.get_joinable_info(gn.clone());
    // let serialized_proposal = david.request_join(group_id, epoch);
    // println!("<------ David requested to join the group! ------->");
    // println!("<------ Bob allows David to join the group! ------->");
    // let processed_results = bob.process_incoming_message(gn.clone(), serialized_proposal);

    // println!("<------ David joins the group! ------->");
    // david.process_invite(gn.clone(), processed_results.welcome.unwrap(), None);

    // // david sends a message:
    // let message_text = "Hello, (bob and charlie)!".to_string();
    // println!("{}", format!("David: {}", message_text).purple());
    // let serialized_message = david.create_message(gn.clone(), message_text);

    // end of old code

    // start a client:
    println!("\n\n<!------ Starting alice client and connecting to server... ------->");
    let server_address = "http://127.0.0.1:8080".to_string();
    let gn = "alphabet_group".to_string();
    let mut aliceClient = ConvoClient::new("alice".to_string());
    aliceClient.connect_to_server(server_address.clone()).await;
    println!("<!------ Alice client connected to the server ------->");
    let users_list = aliceClient.list_users().await;
    println!("Users: {:?}", users_list.len()); // should be 1

    // start bobClient:
    // make bob's name pseudo random:
    let bob_name = format!("bob_{}", rand::thread_rng().gen_range(0..1000000));
    let mut bobClient = ConvoClient::new(bob_name.clone());
    bobClient.connect_to_server(server_address.clone()).await;

    // alice calls list_users again, notices bob, and invites bob to join the group
    let users_list = aliceClient.list_users().await;
    println!("Users list: {:?}", users_list.len()); // should be 2

    let bob_user = users_list
        .iter()
        .find(|user| user.name == bob_name.clone())
        .expect("bob not found!");

    let bob_user_id = bob_user.user_id.clone();
    let bob_key_package = bob_user.serialized_key_package.clone();

    println!("bob_userid: {}", bob_user_id);

    println!("<!------ Alice creates a new group (alphabet_group)! ------->");
    aliceClient.create_group(gn.clone()).await;
    let group_id = aliceClient.get_group_id(gn.clone()).await;

    println!("<!------ Alice invites bob to the group! ------->");
    aliceClient
        .invite_user_to_group(
            bob_user_id.clone(),
            group_id.clone(),
            bob_key_package.clone(),
        )
        .await;

    println!("<!------ Bob checks his incoming messages! ------->");
    bobClient.check_incoming_messages(group_id.clone()).await;

    println!("<!------ Bob accepts the invite! ------->");

    // // list bob's groups:
    // let groups = bobClient.manager.groups;
    // // print all groups:
    // for (group_id, group) in groups {
    //     println!("Group ID: {:?}", group_id);
    //     println!("Group name: {:?}", group.name);
    // }

    println!("<!------ Bob has joined the alphabet_group! ------->");

    // // list bob's groups:
    // let groups = bobClient.manager.groups;
    // // print all groups:
    // for (group_id, group) in groups {
    //     println!("Group ID: {:?}", group_id);
    //     println!("Group name: {:?}", group.name);
    // }

    // bob and alice can now send messages to each other:\
    println!("<!------ Bob sends a message to alice! ------->");
    bobClient
        .send_message(group_id.clone(), "Hello, alice!".to_string())
        .await;
    // println!("<!------ Alice sends a message to bob! ------->");
    // aliceClient.send_message(group_id.clone(), "Hello, bob!".to_string()).await;

    // fetch new messages:
    // println!("<!------ Bob checks his incoming messages! ------->");
    // bobClient.check_incoming_messages(group_id.clone()).await;
    println!("<!------ Alice checks her incoming messages! ------->");
    aliceClient.check_incoming_messages(group_id.clone()).await;

    // alice's message list:
    let messages = aliceClient.get_group_messages(group_id.clone());
    println!("Alice's message list: {:?}", messages);
    // bob's message list:
    let messages = bobClient.get_group_messages(group_id.clone());
    println!("Bob's message list: {:?}", messages);

    // aliceClient.invite_user_to_group("bob".to_string(), "alice_group".to_string());

    // bobClient.accept_invite("alice_group".to_string());

    // aliceClient.send_message("alice_group".to_string(), "Hello, bob!".to_string());
    // bobClient.send_message("alice_group".to_string(), "Hello, alice!".to_string());

    // // Define ciphersuite ...
    // let ciphersuite = Ciphersuite::MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519;
    // // ... and the crypto provider to use.
    // let provider = &OpenMlsRustCrypto::default();

    // // Now let's create two participants.

    // // First they need credentials to identify them
    // let (alice_credential_with_key, alice_signer) = utils::generate_credential_with_key(
    //     "alice".into(),
    //     CredentialType::Basic,
    //     ciphersuite.signature_algorithm(),
    //     provider,
    // );

    // let (bob_credential_with_key, bob_signer) = utils::generate_credential_with_key(
    //     "bob".into(),
    //     CredentialType::Basic,
    //     ciphersuite.signature_algorithm(),
    //     provider,
    // );

    // // Then they generate key packages to facilitate the asynchronous handshakes
    // // in MLS

    // // Generate KeyPackages
    // let bob_key_package =
    //     utils::generate_key_package(ciphersuite, provider, &bob_signer, bob_credential_with_key);

    // // Now alice starts a new group ...
    // let mut alice_group = MlsGroup::new(
    //     provider,
    //     &alice_signer,
    //     &MlsGroupCreateConfig::default(),
    //     alice_credential_with_key,
    // )
    // .expect("An unexpected error occurred.");

    // // ... and invites bob.
    // // The key package has to be retrieved from bob in some way. Most likely
    // // via a server storing key packages for users.
    // let (mls_message_out, welcome_out, group_info) = alice_group
    //     .add_members(
    //         provider,
    //         &alice_signer,
    //         &[bob_key_package.key_package().clone()],
    //     )
    //     .expect("Could not add members.");

    // // alice merges the pending commit that adds bob.
    // alice_group
    //     .merge_pending_commit(provider)
    //     .expect("error merging pending commit");

    // // Sascha serializes the [`MlsMessageOut`] containing the [`Welcome`].
    // let serialized_welcome = welcome_out
    //     .tls_serialize_detached()
    //     .expect("Error serializing welcome");

    // // bob can now de-serialize the message as an [`MlsMessageIn`] ...
    // let mls_message_in = MlsMessageIn::tls_deserialize(&mut serialized_welcome.as_slice())
    //     .expect("An unexpected error occurred.");

    // // ... and inspect the message.
    // let welcome = match mls_message_in.extract() {
    //     MlsMessageBodyIn::Welcome(welcome) => welcome,
    //     // We know it's a welcome message, so we ignore all other cases.
    //     _ => unreachable!("Unexpected message type."),
    // };

    // // Now bob can build a staged join for the group in order to inspect the welcome
    // let bob_staged_join = StagedWelcome::new_from_welcome(
    //     provider,
    //     &MlsGroupJoinConfig::default(),
    //     welcome,
    //     // The public tree is need and transferred out of band.
    //     // It is also possible to use the [`RatchetTreeExtension`]
    //     Some(alice_group.export_ratchet_tree().into()),
    // )
    // .expect("Error creating a staged join from Welcome");

    // // Finally, bob can create the group
    // let mut bob_group = bob_staged_join
    //     .into_group(provider)
    //     .expect("Error creating the group from the staged join");

    // // bob sends a message to alice
    // let message_from_bob = "Hello, alice!".as_bytes();
    // let mls_message_out = bob_group
    //     .create_message(provider, &bob_signer, &message_from_bob)
    //     .expect("Error creating application message.");

    // // // send the message to alice as bytes:
    // // let mls_message_out_bytes = mls_message_out.to_bytes().unwrap();
    // // println!("Message to alice: {}", String::from_utf8(mls_message_out_bytes).unwrap());

    // let mls_message = MlsMessageIn::tls_deserialize_exact(mls_message_out.to_bytes().unwrap())
    //     .expect("Could not deserialize message.");

    // // let serialized_message = encrypted_message.tls_serialize_detached().unwrap();
    // // let mls_message_in = MlsMessageIn::tls_deserialize(&mut serialized_message.as_slice()).unwrap();

    // // alice decrypts the message

    // let protocol_message: ProtocolMessage = mls_message
    //     .try_into_protocol_message()
    //     .expect("Expected a PublicMessage or a PrivateMessage");
    // let processed_message = alice_group
    //     .process_message(provider, protocol_message)
    //     .expect("Could not process message.");

    // if let ProcessedMessageContent::ApplicationMessage(application_message) =
    //     processed_message.into_content()
    // {
    //     // Check the message
    //     // assert_eq!(application_message.into_bytes(), b"Hi, I'm Alice!");
    //     println!(
    //         "Processed message: {}",
    //         String::from_utf8(application_message.into_bytes()).unwrap()
    //     );
    // }

    println!("\n<------ Goodbye, world! ------->\n");
    Ok(())
}

async fn server() {
    println!("Launching Rocket server...");

    // run on port 8080:
    let config = Config {
        port: 8080,
        ..Config::default()
    };

    let server_state = ServerState {
        convo_server: Mutex::new(ConvoServer::new()),
    };
    let rocket = rocket::custom(config)
        .mount(
            "/api",
            rocket::routes![
                connect,
                list_users,
                invite_user,
                create_group,
                get_new_messages,
                accept_invite,
                send_message
            ],
        )
        .manage(rocket::tokio::sync::broadcast::channel::<tokio::net::windows::named_pipe::PipeMode>(1024).0)
        .manage(server_state);

    if let Err(e) = rocket.launch().await {
        println!("Rocket server error: {}", e);
    }
}

#[tokio::main]
async fn main() {
    let args: Vec<String> = env::args().collect();

    match args.get(1).map(|s| s.as_str()) {
        Some("client") => {
            println!("Starting client...");
            client().await;
        }
        Some("server") => {
            // Handle join command
            println!("Starting server...");
            server().await;
        }
        _ => {
            println!("Usage:");
            println!("  cargo run client");
            println!("  cargo run server");
        }
    }
}
