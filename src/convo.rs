use openmls::prelude::{tls_codec::*, *};
use openmls_basic_credential::SignatureKeyPair;
use openmls_rust_crypto::OpenMlsRustCrypto;
use std::{collections::HashMap, ops::Deref};

use crate::utils::{generate_credential_with_key, generate_key_package};
use openmls::prelude::{MlsMessageBodyIn, MlsMessageIn};

pub struct GroupWrapper {
    name: String,
    mls_group: MlsGroup,
}


// impl Deref for Group {
//     type Target = MlsGroup;
//     fn deref(&self) -> &Self::Target {
//         &self.mls_group
//     }
// }

impl GroupWrapper {
    pub fn new(name: String, mls_group: MlsGroup) -> Self {
        Self {
            name,
            mls_group: mls_group,
        }
    }
}

pub struct ConvoManager {
    provider: OpenMlsRustCrypto,
    ciphersuite: Ciphersuite,
    signer: SignatureKeyPair,
    credential_with_key: CredentialWithKey,
    groups: HashMap<String, GroupWrapper>,
}

impl ConvoManager {
    pub fn init(name: String) -> Self {
        let ciphersuite = Ciphersuite::MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519;
        let provider = OpenMlsRustCrypto::default();

        let (credential_with_key, signer) = generate_credential_with_key(
            name.into(),
            CredentialType::Basic,
            ciphersuite.signature_algorithm(),
            &provider,
        );
        Self {
            provider: provider,
            ciphersuite: ciphersuite,
            signer: signer,
            credential_with_key: credential_with_key,
            groups: HashMap::new(),
        }
    }

    pub fn get_key_package(&self) -> KeyPackageBundle {
        let key_package = generate_key_package(
            self.ciphersuite,
            &self.provider,
            &self.signer,
            self.credential_with_key.clone(),
        );
        key_package
    }

    pub fn process_invite(&mut self, group_name: String, welcome: Vec<u8>, ratchet_tree: Vec<u8>) {
        // bob can now de-serialize the message as an [`MlsMessageIn`] ...
        let mls_message_in = MlsMessageIn::tls_deserialize(&mut welcome.as_slice())
            .expect("An unexpected error occurred.");

        // ... and inspect the message.
        let welcome = match mls_message_in.extract() {
            MlsMessageBodyIn::Welcome(welcome) => welcome,
            // We know it's a welcome message, so we ignore all other cases.
            _ => unreachable!("Unexpected message type."),
        };

        let ratchet_tree_deserialized =
            RatchetTreeIn::tls_deserialize(&mut ratchet_tree.as_slice())
                .expect("Error deserializing ratchet tree");

        // Now bob can build a staged join for the group in order to inspect the welcome
        let bob_staged_join = StagedWelcome::new_from_welcome(
            &self.provider,
            &MlsGroupJoinConfig::default(),
            welcome,
            // The public tree is need and transferred out of band.
            // It is also possible to use the [`RatchetTreeExtension`]
            Some(ratchet_tree_deserialized),
        )
        .expect("Error creating a staged join from Welcome");

        // Finally, bob can create the group
        let mut new_group = bob_staged_join
            .into_group(&self.provider)
            .expect("Error creating the group from the staged join");

        // create the group:
        let group = GroupWrapper {
            name: group_name.clone(),
            mls_group: new_group,
        };

        self.groups.insert(group_name.clone(), group);
    }

    pub fn create_new_group(&mut self, name: String) {
        let alice_group = MlsGroup::new(
            &self.provider,
            &self.signer,
            &MlsGroupCreateConfig::default(),
            self.credential_with_key.clone(),
        )
        .expect("An unexpected error occurred.");

        let group = GroupWrapper {
            name: name.clone(),
            mls_group: alice_group,
        };
        self.groups.insert(name.clone(), group);
    }

    pub fn create_invite(
        &mut self,
        group_name: String,
        key_package: KeyPackageBundle,
    ) -> (Vec<u8>, Vec<u8>) {
        let group = self.groups.get_mut(&group_name).unwrap();
        let mls_group = &mut group.mls_group;
        let (mls_message_out, welcome_out, group_info) = mls_group
            .add_members(
                &self.provider,
                &self.signer,
                &[key_package.key_package().clone()],
            )
            .expect("Could not add members.");

        // alice merges the pending commit that adds bob.
        mls_group
            .merge_pending_commit(&self.provider)
            .expect("error merging pending commit");

        let serialized_welcome = welcome_out
            .tls_serialize_detached()
            .expect("Error serializing welcome");
        let ratchet_tree = mls_group
            .export_ratchet_tree()
            .tls_serialize_detached()
            .expect("Error serializing ratchet tree");
        (serialized_welcome, ratchet_tree)
    }

    pub fn create_message(&mut self, group_name: String, message: String) -> Vec<u8> {
        let group = self.groups.get_mut(&group_name).unwrap();
        let mls_group = &mut group.mls_group;
        let mls_message_out = mls_group
            .create_message(&self.provider, &self.signer, &message.as_bytes())
            .expect("Error creating application message.");
        mls_message_out.to_bytes().unwrap()
    }

    pub fn process_incoming_message(
        &mut self,
        serialized_message: Vec<u8>,
        group_name: String,
    ) -> String {
        let group = self.groups.get_mut(&group_name).unwrap();
        let mls_group = &mut group.mls_group;

        let mls_message = MlsMessageIn::tls_deserialize_exact(serialized_message)
            .expect("Could not deserialize message.");

        // decrypt the message:
        let protocol_message: ProtocolMessage = mls_message
            .try_into_protocol_message()
            .expect("Expected a PublicMessage or a PrivateMessage");
        let processed_message = mls_group
            .process_message(&self.provider, protocol_message)
            .expect("Could not process message.");

        let processed_content = processed_message.into_content();
        let application_message = match processed_content {
            ProcessedMessageContent::ApplicationMessage(msg) => msg,
            ProcessedMessageContent::ProposalMessage(_) => panic!("Unexpected proposal message"),
            ProcessedMessageContent::ExternalJoinProposalMessage(_) => {
                panic!("Unexpected external join proposal")
            }
            ProcessedMessageContent::StagedCommitMessage(_) => {
                panic!("Unexpected staged commit message")
            }
        };

        let message = String::from_utf8(application_message.into_bytes()).unwrap();
        // println!("Processed message: {}", message);
        message

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

    // pub fn send_message_to_group(
    //     message: String,
    //     public_group_state: PublicGroupState,
    // ) -> PublicGroupState {
    //     // TODO: implement the logic to send the message to the group
    //     public_group_state
    // }
}
