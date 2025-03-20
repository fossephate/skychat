// src/convo/manager.rs

use base64::engine::general_purpose;
use base64::Engine;
use openmls::prelude::tls_codec::{Deserialize as _, Serialize as _};
use openmls::prelude::{tls_codec::*, *};
use openmls_basic_credential::SignatureKeyPair;
use openmls_rust_crypto::OpenMlsRustCrypto;
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use std::collections::HashMap;

use crate::utils::{generate_credential_with_key, generate_key_package};
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

pub struct ProcessedResults {
    pub message: Option<String>,
    // pub welcome: Option<Vec<u8>>,
    pub invite: Option<ConvoInvite>,
}

#[derive(Serialize, Deserialize)]
pub struct SerializedCredentials {
    pub signer: Vec<u8>,
    pub serialized_credential_with_key: Vec<u8>,
    pub storage: HashMap<String, Vec<u8>>,
    pub group_names: Vec<String>,
    pub group_name_to_id: HashMap<String, GroupId>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]

pub struct ConvoInvite {
    pub sender_id: String,
    pub group_name: String,
    pub welcome_message: Vec<u8>,
    pub ratchet_tree: Option<Vec<u8>>,
    pub global_index: u64,
    pub fanned: Option<Vec<u8>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConvoMessage {
    pub global_index: u64,
    pub sender_id: String,
    pub unix_timestamp: u64,
    pub message: Option<Vec<u8>>,
    pub invite: Option<ConvoInvite>,
}

pub struct ConvoManager {
    pub id: String,
    provider: OpenMlsRustCrypto,
    ciphersuite: Ciphersuite,
    signer: SignatureKeyPair,
    credential_with_key: CredentialWithKey,
    pub groups: HashMap<GroupId, LocalGroup>,
    pub pending_invites: Vec<ConvoInvite>,
}

impl ConvoManager {
    pub fn init(id: String) -> Self {
        let ciphersuite = Ciphersuite::MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519;
        let provider = OpenMlsRustCrypto::default();

        let (credential_with_key, signer) = generate_credential_with_key(
            id.clone().into(),
            CredentialType::Basic,
            ciphersuite.signature_algorithm(),
            &provider,
        );
        Self {
            id: id.clone(),
            provider: provider,
            ciphersuite: ciphersuite,
            signer: signer,
            credential_with_key: credential_with_key,
            groups: HashMap::new(),
            pending_invites: Vec::new(),
        }
    }

    pub fn save_state(&self) -> SerializedCredentials {
        let storage = self.provider.storage();
        let values = storage.values.read().unwrap();
        let converted_storage: HashMap<String, Vec<u8>> = values
            .iter()
            .map(|(k, v)| (general_purpose::STANDARD.encode(k), v.clone()))
            .collect();

        // let serialized_credential_with_key = TlsSerialize::tls_serialize_detached(&self.credential_with_key).unwrap();
        // let serialized_credential_with_key = Serializer::SerializeMap(&self.credential_with_key).unwrap();
        let serialized_credential_with_key: Vec<u8> = bincode::serialize(&self.credential_with_key)
            .expect("Failed to serialize credential with key");

        let serialized = SerializedCredentials {
            signer: self.signer.tls_serialize_detached().unwrap(),
            serialized_credential_with_key: serialized_credential_with_key,
            storage: converted_storage,
            group_names: self.groups.values().map(|g| g.name.clone()).collect(),
            group_name_to_id: self
                .groups
                .iter()
                .map(|(k, v)| (v.name.clone(), k.clone()))
                .collect(),
        };
        serialized
    }

    pub fn load_state(
        &mut self,
        serialized: SerializedCredentials,
    ) -> Result<(), Box<dyn std::error::Error>> {
        // Convert storage back to Vec<u8> keys
        let converted_storage: HashMap<Vec<u8>, Vec<u8>> = serialized
            .storage
            .iter()
            .map(|(k, v)| (general_purpose::STANDARD.decode(k).unwrap(), v.clone()))
            .collect();

        self.signer = SignatureKeyPair::tls_deserialize_exact_bytes(&serialized.signer)?;
        // self.credential_with_key = serialized.credential_with_key;
        let deserialized_credential_with_key: CredentialWithKey =
            bincode::deserialize(&serialized.serialized_credential_with_key).unwrap();
        self.credential_with_key = deserialized_credential_with_key;

        // Update storage
        let provider_storage = self.provider.storage();
        *provider_storage.values.write().unwrap() = converted_storage;

        // load the groups:
        for group_name in serialized.group_names {
            let group_id = serialized.group_name_to_id.get(&group_name).unwrap();
            let group = MlsGroup::load(
                provider_storage,
                &openmls::group::GroupId::from_slice(group_id.as_slice()),
            )
            .unwrap();
            if let Some(group) = group {
                self.groups
                    .insert(group_id.clone(), LocalGroup::new(group_name, group));
            }
        }
        Ok(())
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

    pub fn process_raw_invite(
        &mut self,
        sender_id: String,
        group_name: String,
        welcome_message: Vec<u8>,
        ratchet_tree: Option<Vec<u8>>,
        fanned: Option<Vec<u8>>,
    ) {
        self.process_invite(ConvoInvite {
            sender_id: sender_id.clone(),
            group_name: group_name.clone(),
            welcome_message: welcome_message.clone(),
            ratchet_tree: ratchet_tree.clone(),
            global_index: 0,
            fanned: fanned.clone(),
        });
    }

    pub fn process_invite(&mut self, invite: ConvoInvite) {
        // bob can now de-serialize the message as an [`MlsMessageIn`] ...
        let mls_message_in = MlsMessageIn::tls_deserialize(&mut invite.welcome_message.as_slice())
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
        if let Some(ratchet_tree) = invite.ratchet_tree {
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
            global_index: invite.global_index.clone(),
            name: invite.group_name.clone(),
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
        group_id: &GroupId,
        serialized_key_package: Vec<u8>,
    ) -> ConvoInvite {
        let group = self.groups.get_mut(group_id).expect("group not found");
        let mls_group = &mut group.mls_group;

        let key_package_in = KeyPackageIn::tls_deserialize_exact(&serialized_key_package)
            .expect("Error deserializing key package");

        let key_package = key_package_in
            .validate(self.provider.crypto(), ProtocolVersion::Mls10)
            .expect("Invalid KeyPackage");

        let (fanned, welcome_out, group_info) = mls_group
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
        let serialized_fanned = fanned
            .tls_serialize_detached()
            .expect("Error serializing fanned");
        ConvoInvite {
            sender_id: self.id.clone(),
            group_name: group.name.clone(),
            welcome_message: serialized_welcome,
            ratchet_tree: Some(ratchet_tree),
            global_index: 1, // TODO: this should be a parameter:
            fanned: Some(serialized_fanned),
        }
    }

    pub fn create_message(&mut self, group_id: &GroupId, message: String) -> Vec<u8> {
        let group = self.groups.get_mut(group_id).expect("group not found");
        let mls_group = &mut group.mls_group;
        let mls_message_out = mls_group
            .create_message(&self.provider, &self.signer, &message.as_bytes())
            .expect("Error creating application message.");
        mls_message_out.to_bytes().unwrap()
    }

    pub fn process_message(
        &mut self,
        // group_id: GroupId,
        serialized_message: SerializedMessage,
        // default values for sender_id and sender_name are None
        sender_id: Option<String>,
    ) -> ProcessedResults {
        let mls_message = MlsMessageIn::tls_deserialize_exact(serialized_message)
            .expect("Could not deserialize message.");

        // decrypt the message:
        let protocol_message: ProtocolMessage = mls_message
            .try_into_protocol_message()
            .expect("Expected a PublicMessage or a PrivateMessage");
        // let processed_message = mls_group
        //     .process_message(&self.provider, protocol_message)
        //     .expect("Could not process message.");

        let group_id = protocol_message.group_id().to_vec();
        let group = self.groups.get_mut(&group_id).unwrap();
        let mls_group = &mut group.mls_group;

        let processed_message = mls_group.process_message(&self.provider, protocol_message);

        if processed_message.is_err() {
            println!(
                "Error processing message: {:?}",
                processed_message.err().unwrap()
            );
            return ProcessedResults {
                message: None,
                invite: None,
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
                    invite: None,
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

                mls_group
                    .merge_pending_commit(&self.provider)
                    .expect("Could not merge commit");

                // convert the Option<MlsMessageOut> to MlsMessageOut:
                let welcome = welcome.expect("Welcome was not returned");

                // serialize the welcome:
                let serialized_welcome = welcome
                    .tls_serialize_detached()
                    .expect("Error serializing welcome");

                // export the ratchet tree to go along with the invite:
                let ratchet_tree = mls_group
                    .export_ratchet_tree()
                    .tls_serialize_detached()
                    .expect("Error serializing ratchet tree");

                // let serialized_fanned = fanned
                //     .tls_serialize_detached()
                //     .expect("Error serializing fanned");

                ProcessedResults {
                    message: None,
                    invite: Some(ConvoInvite {
                        sender_id: self.id.clone(),
                        group_name: group.name.clone(),
                        welcome_message: serialized_welcome,
                        ratchet_tree: Some(ratchet_tree),
                        global_index: group.global_index,
                        // fanned: Some(serialized_fanned),
                        fanned: None,
                    }),
                }
            }
            ProcessedMessageContent::StagedCommitMessage(staged_commit) => {
                group
                    .mls_group
                    .merge_staged_commit(&self.provider, *staged_commit)
                    .expect("error merging staged commit");
                ProcessedResults {
                    message: None,
                    invite: None,
                }
            }
        };

        processed_results
    }

    pub fn kick_member(
        &mut self,
        group_id: GroupId,
        serialized_key_package: Vec<u8>,
        // member_credential: Vec<u8>,
    ) -> (SerializedMessage, Option<Vec<u8>>) {
        let group = self.groups.get_mut(&group_id).unwrap();
        let mls_group = &mut group.mls_group;

        // let key_package_in = KeyPackageIn::tls_deserialize_exact(&serialized_key_package)
        //     .expect("Error deserializing key package");

        // let key_package = key_package_in
        //     .validate(self.provider.crypto(), ProtocolVersion::Mls10)
        //     .expect("Invalid KeyPackage");

        let mut member_index: LeafNodeIndex = LeafNodeIndex::new(0);
        // let members = mls_group.members();
        // members.for_each(|m| {
        //     if m.credential.serialized_content() == member_credential {
        //         member_index = m.index;
        //     }
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

    pub fn request_join(&mut self, group_id: &GroupId, epoch: &GroupEpoch) -> Vec<u8> {
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

    // higher level functions that make this class easier to use:
    // generally uses "Convo" objects instead of "Mls" objects

    pub fn process_convo_messages(
        &mut self,
        messages: Vec<ConvoMessage>,
        group_id: Option<&GroupId>,
    ) {
        // if the message's sender_id is from ourself, skip it: (make a new vector with the filtered messages):
        let filtered_messages: Vec<ConvoMessage> = messages
            .iter()
            .filter(|m| m.sender_id != self.id)
            .map(|m| m.clone())
            .collect();

        // if the message is an invite, process it:
        for message in filtered_messages {
            if let Some(invite) = message.invite {
                self.pending_invites.push(invite);
            }
            
            // if the message is a message, process it:
            if let Some(msg) = message.message {
                self.process_message(msg, Some(message.sender_id));
            }

            if let Some(group_id) = group_id {
                let group = self.groups.get_mut(group_id).unwrap();
                if message.global_index > group.global_index {
                    group.global_index = message.global_index;
                }
            }
        }
    }

    // not strictly necessary but helpful functions:
    pub fn group_get_epoch(&mut self, group_id: &GroupId) -> GroupEpoch {
        let group = self.groups.get_mut(group_id).unwrap();
        let mls_group = &mut group.mls_group;

        let epoch = mls_group.epoch();
        epoch
    }

    pub fn group_set_index(&mut self, group_id: &GroupId, index: u64) {
        let group = self.groups.get_mut(group_id).unwrap();
        group.global_index = index;
    }

    pub fn group_get_index(&self, group_id: &GroupId) -> u64 {
        let group = self.groups.get(group_id).unwrap();
        group.global_index
    }

    pub fn group_push_message(&mut self, group_id: &GroupId, message: String, sender_id: String) {
        let group = self.groups.get_mut(group_id).unwrap();
        group.decrypted.push(MessageItem {
            text: message,
            sender_id: sender_id,
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64,
        });
    }
}
