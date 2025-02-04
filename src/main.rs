use openmls::prelude::{tls_codec::*, *};
use openmls_basic_credential::SignatureKeyPair;
use openmls_rust_crypto::OpenMlsRustCrypto;
use colored::*;

pub use convo::ConvoManager;
pub mod convo;
pub mod utils;

fn main() {
    println!("\n<------ Hello, world! ------->\n");

    // create alice and bob:
    let mut alice = ConvoManager::init("alice".to_string());
    let mut bob = ConvoManager::init("bob".to_string());
    let group_name = "alice_group".to_string();

    // alice creates a new group and invites bob:
    alice.create_new_group(group_name.clone());
    let (fanned, welcome, ratchet_tree) = alice.create_invite(group_name.clone(), bob.get_key_package());
    bob.process_invite(group_name.clone(), welcome, ratchet_tree);

    println!("<------ Alice creates a new group and invites Bob! ------->");


    // bob sends a message to alice:
    let message_text = "Hello, alice!".to_string();
    println!("{}", format!("Bob: {}", message_text).blue());
    let serialized_message = bob.create_message(group_name.clone(), message_text);
    let mls_message_in = alice.process_incoming_message(group_name.clone(), serialized_message).unwrap();
    println!("{}", format!("Alice decrypted: {}", mls_message_in).green());

    // alice sends a message to bob:
    let message_text = "Hello, bob!".to_string();
    println!("{}", format!("Alice: {}", message_text).red());
    let serialized_message = alice.create_message(group_name.clone(), message_text);
    let mls_message_in = bob.process_incoming_message(group_name.clone(), serialized_message).unwrap();
    println!("{}", format!("Bob decrypted: {}", mls_message_in).green());

    // charlie is created:
    let mut charlie = ConvoManager::init("charlie".to_string());
    // and bob invites charlie:
    let (fanned, welcome, ratchet_tree) = bob.create_invite(group_name.clone(), charlie.get_key_package());
    
    // charlie + everyone* (not actually everyone, but I think log(n) people in the tree?)
    // must process the invite before any new messages can be decrypted
    // (excluding bob since he created the invite)
    charlie.process_invite(group_name.clone(), welcome.clone(), ratchet_tree.clone());
    // println!("charlie processed invite");
    // everyone* else must processes the fanned commit like a normal message
    alice.process_incoming_message(group_name.clone(), fanned.clone());
    // println!("alice processed fanned commit");

    println!("<------ Charlie enters the group! ------->");


    // charlie, now in the group, sends a message:
    let message_text = "Hello, everyone!".to_string();
    println!("{}", format!("Charlie: {}", message_text).yellow());
    let serialized_message = charlie.create_message(group_name.clone(), message_text);

    // alice decrypts the message:
    let mls_message_in = alice.process_incoming_message(group_name.clone(), serialized_message.clone()).unwrap();
    println!("{}", format!("Alice decrypted: {}", mls_message_in).green());

    // bob decrypts the message:
    let mls_message_in = bob.process_incoming_message(group_name.clone(), serialized_message.clone()).unwrap();
    println!("{}", format!("Bob decrypted: {}", mls_message_in).green());



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
}
