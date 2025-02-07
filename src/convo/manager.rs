// src/convo/manager.rs

use openmls::prelude::tls_codec::{Deserialize as _, Serialize as _};
use openmls::prelude::{tls_codec::*, *};
use openmls_basic_credential::SignatureKeyPair;
use openmls_rust_crypto::OpenMlsRustCrypto;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Read;
use std::sync::RwLock;
use std::{collections::HashMap, ops::Deref};

use crate::utils::{generate_credential_with_key, generate_key_package};
use openmls::prelude::{KeyPackage, TlsDeserialize, TlsSerialize};
use openmls::prelude::{MlsMessageBodyIn, MlsMessageIn};

type GroupId = Vec<u8>;
type SerializedMessage = Vec<u8>;
type SerializedProposal = Vec<u8>;

#[derive(Debug, Serialize, Deserialize)]
pub struct MessageItem {
    pub text: String,
    pub sender_id: String,
    pub timestamp: u64,
}

#[derive(Debug)]
pub struct LocalGroup {
    pub name: String,
    pub global_index: u64,
    pub mls_group: MlsGroup,
    pub decrypted: Vec<MessageItem>,
}

// impl Deref for Group {
//     type Target = MlsGroup;
//     fn deref(&self) -> &Self::Target {
//         &self.mls_group
//     }
// }

impl LocalGroup {
    pub fn new(name: String, mls_group: MlsGroup) -> Self {
        Self {
            name,
            global_index: 0,
            mls_group: mls_group,
            decrypted: Vec::new(),
        }
    }
}

pub struct ConvoManager {
    provider: OpenMlsRustCrypto,
    ciphersuite: Ciphersuite,
    signer: SignatureKeyPair,
    credential_with_key: CredentialWithKey,
    pub groups: HashMap<GroupId, LocalGroup>,
}

pub struct ProcessedResults {
    pub message: Option<String>,
    pub welcome: Option<Vec<u8>>,
}

pub struct GroupInvite {
    pub fanned: Vec<u8>,
    pub welcome: Vec<u8>,
    pub ratchet_tree: Option<Vec<u8>>,
}

#[derive(Serialize, Deserialize)]
pub struct SerializedCredentials {
    pub signer: Vec<u8>,
    pub credential_with_key: CredentialWithKey,
    pub storage: RwLock<HashMap<Vec<u8>, Vec<u8>>>,
}

impl ConvoManager {
    pub fn init(name: String) -> Self {
        let ciphersuite = Ciphersuite::MLS_128_DHKEMP256_AES128GCM_SHA256_P256;
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

    pub fn save_credentials(
        &self,
        path: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {

        let storage = self.provider.storage();
        let values = storage.values.read().unwrap();
        let serialized = SerializedCredentials {
            signer: self.signer.tls_serialize_detached().unwrap(),
            credential_with_key: self.credential_with_key.clone(),
            storage: RwLock::new(values.clone()),
        };

        let json = serde_json::to_string(&serialized)?;
        fs::write(path, json)?;
        Ok(())
    }

    pub fn load_credentials(&mut self, path: &str) {
        let json = fs::read_to_string(path).unwrap();
        let serialized: SerializedCredentials = serde_json::from_str(&json).expect("failed to deserialize");
        self.signer = SignatureKeyPair::tls_deserialize_exact_bytes(serialized.signer.as_slice()).expect("failed to deserialize");
        self.credential_with_key = serialized.credential_with_key;
    }

    pub fn get_key_package(&self) -> Vec<u8> {
        let key_package = generate_key_package(
            self.ciphersuite,
            &self.provider,
            &self.signer,
            self.credential_with_key.clone(),
        );

        // serialize the key package:
        let kpackage = key_package.key_package().clone();
        // serialize the key package:
        let serialized_key_package = kpackage
            .tls_serialize_detached()
            .expect("Error serializing key package");

        serialized_key_package
    }

    pub fn process_invite(
        &mut self,
        group_name: String,
        welcome: Vec<u8>,
        ratchet_tree: Option<Vec<u8>>,
    ) {
        // bob can now de-serialize the message as an [`MlsMessageIn`] ...
        let mls_message_in = MlsMessageIn::tls_deserialize(&mut welcome.as_slice())
            .expect("An unexpected error occurred.");

        // ... and inspect the message.
        let welcome = match mls_message_in.extract() {
            MlsMessageBodyIn::Welcome(welcome) => welcome,
            // We know it's a welcome message, so we ignore all other cases.
            _ => unreachable!("Unexpected message type."),
        };

        // let ratchet_tree_deserialized =
        //     RatchetTreeIn::tls_deserialize(&mut ratchet_tree.as_slice())
        //         .expect("Error deserializing ratchet tree");

        let mut ratchet_tree_deserialized: Option<RatchetTreeIn> = None;

        // if we have a ratchet tree:
        if let Some(ratchet_tree) = ratchet_tree {
            ratchet_tree_deserialized = Some(
                RatchetTreeIn::tls_deserialize(&mut ratchet_tree.as_slice())
                    .expect("Error deserializing ratchet tree"),
            );
        }

        // Now bob can build a staged join for the group in order to inspect the welcome
        let bob_staged_join = StagedWelcome::new_from_welcome(
            &self.provider,
            &MlsGroupJoinConfig::default(),
            welcome,
            // The public tree is need and transferred out of band.
            // It is also possible to use the [`RatchetTreeExtension`]
            ratchet_tree_deserialized,
        )
        .expect("Error creating a staged join from Welcome");

        // Finally, bob can create the group
        let new_group = bob_staged_join
            .into_group(&self.provider)
            .expect("Error creating the group from the staged join");

        // create the group:
        let group = LocalGroup {
            global_index: 1,
            name: group_name.clone(),
            mls_group: new_group,
            decrypted: Vec::new(),
        };

        let group_id = group.mls_group.group_id().to_vec();

        self.groups.insert(group_id.clone(), group);
    }

    pub fn create_new_group(&mut self, name: String) -> Vec<u8> {
        let alice_group = MlsGroup::new(
            &self.provider,
            &self.signer,
            &MlsGroupCreateConfig::default(),
            self.credential_with_key.clone(),
        )
        .expect("An unexpected error occurred.");

        let group = LocalGroup {
            name: name.clone(),
            mls_group: alice_group,
            global_index: 0,
            decrypted: Vec::new(),
        };
        let group_id = group.mls_group.group_id().to_vec();
        self.groups.insert(group_id.clone(), group);
        group_id
    }

    pub fn create_invite(
        &mut self,
        group_id: Vec<u8>,
        serialized_key_package: Vec<u8>,
    ) -> GroupInvite {
        let group = self.groups.get_mut(&group_id).expect("group not found");
        let mls_group = &mut group.mls_group;

        let key_package_in = KeyPackageIn::tls_deserialize_exact(&serialized_key_package)
            .expect("Error deserializing key package");

        let key_package = key_package_in
            .validate(self.provider.crypto(), ProtocolVersion::Mls10)
            .expect("Invalid KeyPackage");

        let (mls_message_out, welcome_out, group_info) = mls_group
            .add_members(&self.provider, &self.signer, &[key_package])
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
        let fanned = mls_message_out
            .tls_serialize_detached()
            .expect("Error serializing fanned");
        GroupInvite {
            fanned,
            welcome: serialized_welcome,
            ratchet_tree: Some(ratchet_tree),
        }
    }

    pub fn create_message(&mut self, group_id: Vec<u8>, message: String) -> Vec<u8> {
        let group = self.groups.get_mut(&group_id).expect("group not found");
        let mls_group = &mut group.mls_group;
        let mls_message_out = mls_group
            .create_message(&self.provider, &self.signer, &message.as_bytes())
            .expect("Error creating application message.");
        mls_message_out.to_bytes().unwrap()
    }

    pub fn process_incoming_message(
        &mut self,
        group_id: GroupId,
        serialized_message: SerializedMessage,
        // default values for sender_id and sender_name are None
        sender_id: Option<String>,
    ) -> ProcessedResults {
        let group = self.groups.get_mut(&group_id).unwrap();
        let mls_group = &mut group.mls_group;

        let mls_message = MlsMessageIn::tls_deserialize_exact(serialized_message)
            .expect("Could not deserialize message.");

        // decrypt the message:
        let protocol_message: ProtocolMessage = mls_message
            .try_into_protocol_message()
            .expect("Expected a PublicMessage or a PrivateMessage");
        // let processed_message = mls_group
        //     .process_message(&self.provider, protocol_message)
        //     .expect("Could not process message.");

        let processed_message = mls_group.process_message(&self.provider, protocol_message);

        if processed_message.is_err() {
            // println!("Error processing message: {:?}", processed_message.err().unwrap());
            return ProcessedResults {
                message: None,
                welcome: None,
            };
        }

        let processed_content = processed_message.unwrap().into_content();
        let processed_results = match processed_content {
            ProcessedMessageContent::ApplicationMessage(msg) => {
                let text = String::from_utf8(msg.into_bytes()).unwrap();
                let timestamp = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_millis() as u64;
                group.decrypted.push(MessageItem {
                    text: text.clone(),
                    sender_id: sender_id.unwrap_or("Unknown".to_string()),
                    timestamp: timestamp,
                });
                ProcessedResults {
                    message: Some(text),
                    welcome: None,
                }
            }
            ProcessedMessageContent::ProposalMessage(_) => panic!("Unexpected proposal message"),
            ProcessedMessageContent::ExternalJoinProposalMessage(proposal) => {
                mls_group
                    .store_pending_proposal(self.provider.storage(), *proposal)
                    .unwrap();

                let (_commit, welcome, _group_info) = mls_group
                    .commit_to_pending_proposals(&self.provider, &self.signer)
                    .expect("Could not commit");
                // assert_eq!(alice_group.members().count(), 1);
                mls_group
                    .merge_pending_commit(&self.provider)
                    .expect("Could not merge commit");
                // assert_eq!(alice_group.members().count(), 2);

                // let welcome2: MlsMessageIn = welcome.expect("Welcome was not returned");

                // serialize the welcome:
                let serialized_welcome = welcome
                    .tls_serialize_detached()
                    .expect("Error serializing welcome");

                println!("WELCOME CREATED");
                ProcessedResults {
                    message: None,
                    welcome: Some(serialized_welcome),
                }
            }
            ProcessedMessageContent::StagedCommitMessage(staged_commit) => {
                group
                    .mls_group
                    .merge_staged_commit(&self.provider, *staged_commit)
                    .expect("error merging staged commit");
                ProcessedResults {
                    message: None,
                    welcome: None,
                }
            }
        };

        processed_results
    }

    pub fn kick_member(
        &mut self,
        group_id: GroupId,
        serialized_key_package: Vec<u8>,
    ) -> (SerializedMessage, Option<Vec<u8>>) {
        let group = self.groups.get_mut(&group_id).unwrap();
        let mls_group = &mut group.mls_group;

        let key_package_in = KeyPackageIn::tls_deserialize_exact(&serialized_key_package)
            .expect("Error deserializing key package");

        let key_package = key_package_in
            .validate(self.provider.crypto(), ProtocolVersion::Mls10)
            .expect("Invalid KeyPackage");

        let mut member_index: LeafNodeIndex = LeafNodeIndex::new(0);
        // TODO: get the member index where key_package matches
        // let members = mls_group.members();
        // members.for_each(|m| {
        //     // if m.key_package() == key_package.key_package() {
        //     // }
        //     // member_index = m.index;
        // });

        // remove the member:
        let (mls_message_out, welcome_option, _group_info) = mls_group
            .remove_members(&self.provider, &self.signer, &[member_index])
            .expect("error kicking member");

        // merge the pending commit:
        mls_group
            .merge_pending_commit(&self.provider)
            .expect("error merging pending commit");

        // serialize the message & welcome (if it exists)
        let fanned = mls_message_out
            .tls_serialize_detached()
            .expect("Error serializing message");

        if let Some(welcome) = welcome_option {
            let serialized_welcome = welcome
                .tls_serialize_detached()
                .expect("Error serializing welcome");
            return (fanned, Some(serialized_welcome));
        }

        (fanned, None)
    }

    // pub fn get_joinable_info(&mut self, group_name: String) -> (GroupEpoch, GroupId) {
    //     let group = self.groups.get_mut(&group_name).unwrap();
    //     let mls_group = &mut group.mls_group;

    //     let epoch = mls_group.epoch();
    //     let group_id = mls_group.group_id();

    //     (epoch.clone(), group_id.clone())
    // }

    pub fn request_join(&mut self, group_id: GroupId, epoch: GroupEpoch) -> Vec<u8> {
        let key_package_in = KeyPackageIn::tls_deserialize_exact(self.get_key_package())
            .expect("Error deserializing key package");

        let key_package = key_package_in
            .validate(self.provider.crypto(), ProtocolVersion::Mls10)
            .expect("Invalid KeyPackage");

        let proposal =
            JoinProposal::new::<<OpenMlsRustCrypto as OpenMlsProvider>::StorageProvider>(
                key_package,
                openmls::group::GroupId::from_slice(group_id.as_slice()),
                epoch.clone(),
                &self.signer,
            )
            .expect("Could not create external Add proposal");

        let serialized_proposal = proposal
            .tls_serialize_detached()
            .expect("Error serializing proposal");

        serialized_proposal
    }

    // pub fn send_message_to_group(
    //     message: String,
    //     public_group_state: PublicGroupState,
    // ) -> PublicGroupState {
    //     // TODO: implement the logic to send the message to the group
    //     public_group_state
    // }
}
