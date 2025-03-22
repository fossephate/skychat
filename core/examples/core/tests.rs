// src/bin/client.rs

use colored::*;
use crossterm::style::Stylize;
use rand::Rng;
use skychat_client::client::ConvoClient;
use skychat_core::manager::ConvoManager;

async fn old_reference() {
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
}

async fn manual_chat() {
    // create alice and bob:
    let mut alice = ConvoManager::init("alice".to_string());
    let mut bob = ConvoManager::init("bob".to_string());
    let gn = "alice_group".to_string();

    // alice creates a new group and invites bob:
    let gid = alice.create_group(gn.clone());
    let group_invite = alice.create_invite(&gid, bob.get_key_package());
    bob.process_raw_invite(
        group_invite.sender_id.clone(),
        group_invite.group_name.clone(),
        group_invite.welcome_message,
        group_invite.ratchet_tree,
        None,
    );

    println!("<------ Alice creates a new group and invites Bob! ------->");

    // bob sends a message to alice:
    let message_text = "Hello, alice!".to_string();
    println!("{}", format!("Bob: {}", message_text).blue());
    let serialized_message = bob.create_message(&gid, message_text);
    let processed_results = alice.process_message(serialized_message, Some("bob".to_string()));
    println!(
        "{}",
        format!("Alice decrypted: {}", processed_results.message.unwrap()).green()
    );

    // alice sends a message to bob:
    let message_text = "Hello, bob!".to_string();
    println!("{}", format!("Alice: {}", message_text).red());
    let serialized_message = alice.create_message(&gid, message_text);
    let processed_results = bob.process_message(serialized_message, Some("alice".to_string()));
    println!(
        "{}",
        format!("Bob decrypted: {}", processed_results.message.unwrap()).green()
    );

    // charlie is created:
    let mut charlie = ConvoManager::init("charlie".to_string());
    // and bob invites charlie:
    let group_invite = bob.create_invite(&gid, charlie.get_key_package());

    // charlie + everyone* (not actually everyone, but I think log(n) people in the tree?)
    // must process the invite before any new messages can be decrypted
    // (excluding bob since he created the invite)
    charlie.process_raw_invite(
        group_invite.sender_id.clone(),
        gn.clone(),
        group_invite.welcome_message,
        group_invite.ratchet_tree,
        None,
    );
    // everyone* else must processes the fanned commit like a normal message
    alice.process_message(group_invite.fanned.unwrap(), Some("bob".to_string()));

    println!("\n<------ Charlie enters the group! ------->");

    // charlie, now in the group, sends a message:
    let message_text = "Hello, everyone!".to_string();
    println!("{}", format!("Charlie: {}", message_text).yellow());
    let serialized_message = charlie.create_message(&gid, message_text);

    // alice decrypts the message:
    let processed_results =
        alice.process_message(serialized_message.clone(), Some("charlie".to_string()));
    println!(
        "{}",
        format!("Alice decrypted: {}", processed_results.message.unwrap()).green()
    );

    // bob decrypts the message:
    let processed_results =
        bob.process_message(serialized_message.clone(), Some("charlie".to_string()));
    println!(
        "{}",
        format!("Bob decrypted: {}", processed_results.message.unwrap()).green()
    );

    // bob responds:
    let message_text = "Welcome, charlie!".to_string();
    println!("{}", format!("Bob: {}", message_text).blue());
    let serialized_message = bob.create_message(&gid, message_text);
    // charlie and alice decrypt the message:
    let processed_results =
        alice.process_message(serialized_message.clone(), Some("bob".to_string()));
    println!(
        "{}",
        format!("Alice decrypted: {}", processed_results.message.unwrap()).green()
    );
    let processed_results =
        charlie.process_message(serialized_message.clone(), Some("bob".to_string()));
    println!(
        "{}",
        format!("Charlie decrypted: {}", processed_results.message.unwrap()).green()
    );

    println!("\n<------ Charlie kicks Alice out of the group! ------->");
    // charlie kicks alice out of the group!:
    let (fanned, welcome_option) = charlie.kick_member(gid.clone(), alice.get_key_package());

    // bob processes the fanned commit:
    bob.process_message(fanned.clone(), Some("charlie".to_string()));

    // charlie sends a message (to now just bob):
    let message_text = "Hello, (just) bob!".to_string();
    println!("{}", format!("Charlie: {}", message_text).yellow());
    let serialized_message = charlie.create_message(&gid, message_text);

    // bob decrypts the message:
    let processed_results =
        bob.process_message(serialized_message.clone(), Some("charlie".to_string()));
    println!(
        "{}",
        format!("Bob decrypted: {}", processed_results.message.unwrap()).green()
    );

    // david requests to join the group:
    let mut david = ConvoManager::init("david".to_string());
    println!("<------ David created! ------->");
    let epoch = charlie.group_get_epoch(&gid);
    let serialized_proposal = david.request_join(&gid, &epoch);
    println!("<------ David requested to join the group! ------->");
    println!("<------ Bob allows David to join the group! ------->");
    let proposed_invite = bob
        .process_message(serialized_proposal.clone(), Some("david".to_string()))
        .invite
        .expect("invite not found");
    println!("<------ Bob processed the proposal! ------->");

    println!("<------ David joins the group! ------->");
    // print the processed_results:
    // println!("{}", format!("Processed results: {:?}", processed_results.invite.unwrap()).green());
    david.process_raw_invite(
        proposed_invite.sender_id.clone(),
        proposed_invite.group_name.clone(),
        proposed_invite.welcome_message,
        proposed_invite.ratchet_tree,
        None,
    );
    println!("<------ David processed the invite! ------->");

    // // print out the members of the group:
    // let group = david.groups.get(&gid).unwrap();
    // let members = group.mls_group.members().collect::<Vec<_>>();
    // // for each member, print out the name key package:
    // for member in members {
    //     println!("{}", format!("Member: {:?}", member.signature_key).green());
    // }
    // // print david's key package:
    // let key_package = bob.get_key_package();
    // // deserialize the key package:
    // // let key_package = KeyPackage::tls_deserialize(&mut key_package.as_slice()).unwrap();
    // // let key_package_in = KeyPackageIn::tls_deserialize_exact(&key_package)
    // // .expect("Error deserializing key package");
    // println!("{}", format!("Bobs's key package: {:?}", key_package).dark_blue());

    // let ids = bob.group_get_member_ids(&gid);
    // println!("{}", format!("IDs: {:?}", ids).green());

    // charlie must also process the fanned commit:
    // charlie.process_message(proposed_invite.fanned.unwrap(), None);
    // charlie.process_message(serialized_proposal.clone(), None);
    // println!("<------ Charlie processed the invite! ------->");

    // // david sends a message:
    // let message_text = "Hello, (bob and charlie)!".to_string();
    // println!("{}", format!("David: {}", message_text).purple());
    // let serialized_message = david.create_message(&gid, message_text);
    // let processed_results = bob.process_message(serialized_message.clone(), None);
    // println!(
    //     "{}",
    //     format!("Bob decrypted: {}", processed_results.message.unwrap()).green()
    // );
    // let processed_results = charlie.process_message(serialized_message.clone(), None);
    // println!(
    //     "{}",
    //     format!("Charlie decrypted: {}", processed_results.message.unwrap()).green()
    // );

    // end of old code
}

async fn client() -> Result<(), Box<dyn std::error::Error>> {
    println!("\n<------ Hello, world! ------->\n");

    // make sure all our base functions still work:
    manual_chat().await;

    // start a client:
    println!("\n\n<!------ Starting alice client and connecting to server... ------->");
    let mut rng = rand::thread_rng();
    let server_address = "http://127.0.0.1:8888".to_string();
    let alice_name = format!("alice_{}", rng.random_range(0..1000000));
    let bob_name = format!("bob_{}", rng.random_range(0..1000000));
    let charlie_name = format!("charlie_{}", rng.random_range(0..1000000));
    // let david_name = format!("david_{}", rng.random_range(0..1000000));
    let gn = "alphabet_group".to_string();
    let mut alice_client = ConvoClient::new(alice_name.clone());
    alice_client.connect_to_server(server_address.clone()).await;
    println!("<!------ Alice client connected to the server ------->");

    // start bob_client:
    // make bob's name pseudo random:
    let mut bob_client = ConvoClient::new(bob_name.clone());
    bob_client.connect_to_server(server_address.clone()).await;

    // alice calls list_users, notices bob, and invites bob to join the group
    let _ = alice_client.list_users().await;
    let users_list = bob_client.list_users().await;

    let bob_user = users_list
        .iter()
        .find(|user| user.user_id == bob_name.clone())
        .expect("bob not found!");

    let bob_user_id = bob_user.user_id.clone();
    let bob_key_package = bob_user.serialized_key_package.clone();

    println!("<!------ Alice creates a new group (alphabet_group)! ------->");
    alice_client.create_group(gn.clone()).await;
    let group_id = alice_client.get_group_id(gn.clone()).await;

    println!("<!------ Alice invites bob to the group! ------->");
    alice_client
        .invite_user_to_group(
            bob_user_id.clone(),
            group_id.clone(),
            bob_key_package.clone(),
        )
        .await;

    println!("<!------ Bob checks his incoming messages! ------->");
    bob_client.check_incoming_messages(None).await;

    println!("<!------ Bob accepts the invite! ------->");
    bob_client.accept_current_invites().await;

    // // list bob's groups:
    // let groups = bob_client.manager.groups;
    // // print all groups:
    // for (group_id, group) in groups {
    //     println!("Group ID: {:?}", group_id);
    //     println!("Group name: {:?}", group.name);
    // }

    println!("<!------ Bob has joined the alphabet_group! ------->");

    // // list bob's groups:
    // let groups = bob_client.manager.groups;
    // // print all groups:
    // for (group_id, group) in groups {
    //     println!("Group ID: {:?}", group_id);
    //     println!("Group name: {:?}", group.name);
    // }

    // bob and alice can now send messages to each other:
    println!("<!------ Alice sends a message to bob! ------->");
    // aliceClient.check_incoming_messages(group_id.clone()).await;
    alice_client
        .send_message(&group_id, "Welcome to the group, bob!".to_string())
        .await;
    println!("<!------ Bob sends a message to alice! ------->");
    bob_client
        .send_message(&group_id, "Hello, alice!".to_string())
        .await;
    println!("<!------ Bob sends a second message to alice! ------->");
    bob_client
        .send_message(&group_id, "Second message to alice!".to_string())
        .await;
    println!("<!------ Alice sends a reply to bob! ------->");
    alice_client
        .send_message(&group_id, "Reply to bob!".to_string())
        .await;

    // fetch new messages:
    // println!("<!------ Bob checks his messages! ------->");
    // bob_client.check_incoming_messages(group_id.clone()).await;
    println!("<!------ Alice & Bob check their messages! ------->\n");
    alice_client.check_incoming_messages(Some(&group_id)).await;
    bob_client.check_incoming_messages(Some(&group_id)).await;

    println!("<!------ Alice's message history ------->\n");

    // message history from alice's perspective:
    alice_client.print_group_messages(&group_id);

    println!("\n<!------ Bob's message history ------->\n");

    // message history from bob's perspective:
    bob_client.print_group_messages(&group_id);

    // create charlie:
    println!("\n<!------ Creating charlie! ------->");
    let mut charlie_client = ConvoClient::new(charlie_name.clone());
    charlie_client
        .connect_to_server(server_address.clone())
        .await;

    // alice calls list_users, notices charlie, and invites charlie to join the group
    let _ = alice_client.list_users().await;
    let _ = bob_client.list_users().await;
    let users_list = charlie_client.list_users().await;

    let charlie_user = users_list
        .iter()
        .find(|user| user.user_id == charlie_name.clone())
        .expect("charlie not found!");

    let charlie_user_id = charlie_user.user_id.clone();
    let charlie_key_package = charlie_user.serialized_key_package.clone();

    println!("<!------ Alice invites charlie to the group! ------->");
    // invite charlie to the group:
    alice_client
        .invite_user_to_group(
            charlie_user_id.clone(),
            group_id.clone(),
            charlie_key_package.clone(),
        )
        .await;

    println!("<!------ Alice sends a message to charlie! ------->");
    alice_client
        .send_message(&group_id, "Welcome to the group, charlie!".to_string())
        .await;

    println!("<!------ Charlie checks his messages! ------->");
    charlie_client.check_incoming_messages(None).await;

    println!("<!------ Charlie accepts the invite! ------->");
    charlie_client.accept_current_invites().await;

    println!("<!------ Charlie sends a message to alice! ------->");
    charlie_client
        .send_message(&group_id, "Hello, alice!".to_string())
        .await;

    println!("<!------ Bob checks his messages! ------->");
    bob_client.check_incoming_messages(Some(&group_id)).await;

    // bob sends a message to charlie:
    println!("<!------ Bob sends a message to charlie! ------->");
    bob_client
        .send_message(&group_id, "Welcome to the group, charlie!".to_string())
        .await;

    println!("<!------ Charlie checks his messages! ------->");
    charlie_client
        .check_incoming_messages(Some(&group_id))
        .await;

    // display message lists:
    println!("\n\n<!------ Everyone's POV: ------->");
    println!("\n<!------ Alice's message history ------->");
    alice_client.print_group_messages(&group_id);
    println!("\n<!------ Bob's message history ------->");
    bob_client.print_group_messages(&group_id);
    println!("\n<!------ Charlie's message history ------->");
    charlie_client.print_group_messages(&group_id);

    // alice's message list:
    // let messages = aliceClient.get_group_messages(group_id.clone());
    // println!("{}", format!("Alice's message list: {:?}", messages).green());
    // bob's message list:
    // let messages = bob_client.get_group_messages(group_id.clone());
    // println!("{}", format!("Bob's message list: {:?}", messages).green());

    // aliceClient.invite_user_to_group("bob".to_string(), "alice_group".to_string());

    // bob_client.accept_invite("alice_group".to_string());

    // aliceClient.send_message("alice_group".to_string(), "Hello, bob!".to_string());
    // bob_client.send_message("alice_group".to_string(), "Hello, alice!".to_string());

    println!("\n<------ Goodbye, world! ------->\n");
    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("Starting client...");
    // Move your client() function code here
    client().await;
    Ok(())
}
