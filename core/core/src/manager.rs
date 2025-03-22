// src/convo/manager.rs

use anyhow::{bail, Context, Result};
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
    pub id: Vec<u8>,
    pub name: String,
    pub global_index: u64,
    pub mls_group: MlsGroup,
    pub decrypted: Vec<MessageItem>,
}

impl LocalGroup {
    pub fn new(name: String, mls_group: MlsGroup) -> Self {
        Self {
            id: mls_group.group_id().to_vec(),
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
    // pub sig_id_map: HashMap<Vec<u8>, String>,
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
    // pub sig_id_map: HashMap<Vec<u8>, String>,
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
            // sig_id_map: HashMap::new(),
        }
    }

    pub fn save_state(&self) -> Result<SerializedCredentials> {
        let storage = self.provider.storage();
        let values = storage
            .values
            .read()
            .map_err(|e| anyhow::anyhow!("Failed to read storage: {}", e))?;
        let converted_storage: HashMap<String, Vec<u8>> = values
            .iter()
            .map(|(k, v)| (general_purpose::URL_SAFE.encode(k), v.clone()))
            .collect();

        // let serialized_credential_with_key = TlsSerialize::tls_serialize_detached(&self.credential_with_key).unwrap();
        // let serialized_credential_with_key = Serializer::SerializeMap(&self.credential_with_key).unwrap();
        let serialized_credential_with_key: Vec<u8> = bincode::serialize(&self.credential_with_key)
            .expect("Failed to serialize credential with key");

        let serialized_credential_with_key: Vec<u8> = bincode::serialize(&self.credential_with_key)
            .context("Failed to serialize credential with key")?;

        let serialized = SerializedCredentials {
            signer: self
                .signer
                .tls_serialize_detached()
                .context("Failed to serialize signer")?,
            serialized_credential_with_key: serialized_credential_with_key,
            storage: converted_storage,
            group_names: self.groups.values().map(|g| g.name.clone()).collect(),
            group_name_to_id: self
                .groups
                .iter()
                .map(|(k, v)| (v.name.clone(), k.clone()))
                .collect(),
            // sig_id_map: self.sig_id_map.clone(),
        };
        Ok(serialized)
    }

    pub fn load_state(&mut self, serialized: SerializedCredentials) -> Result<()> {
        // Convert storage back to Vec<u8> keys
        let converted_storage: HashMap<Vec<u8>, Vec<u8>> = serialized
            .storage
            .iter()
            .map(|(k, v)| {
                Ok((
                    general_purpose::URL_SAFE
                        .decode(k)
                        .context(format!("Failed to decode key: {}", k))?,
                    v.clone(),
                ))
            })
            .collect::<Result<HashMap<Vec<u8>, Vec<u8>>>>()?;

        self.signer = SignatureKeyPair::tls_deserialize_exact_bytes(&serialized.signer)
            .context("Failed to deserialize signer")?;

        let deserialized_credential_with_key: CredentialWithKey =
            bincode::deserialize(&serialized.serialized_credential_with_key)
                .context("Failed to deserialize credential with key")?;
        self.credential_with_key = deserialized_credential_with_key;

        // Update storage
        let provider_storage = self.provider.storage();
        *provider_storage
            .values
            .write()
            .map_err(|e| anyhow::anyhow!("Failed to write to provider storage: {}", e))? =
            converted_storage;

        // load the groups:
        for group_name in serialized.group_names {
            let group_id = serialized
                .group_name_to_id
                .get(&group_name)
                .context(format!("Group ID not found for group name: {}", group_name))?;

            let group = MlsGroup::load(
                provider_storage,
                &openmls::group::GroupId::from_slice(group_id.as_slice()),
            )
            .context(format!("Failed to load group: {}", group_name))?;

            if let Some(group) = group {
                self.groups
                    .insert(group_id.clone(), LocalGroup::new(group_name, group));
            }
        }

        Ok(())
    }

    pub fn get_key_package(&self) -> Result<Vec<u8>> {
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
            .context("Error serializing key package")?;

        Ok(serialized_key_package)
    }

    pub fn process_raw_invite(
        &mut self,
        sender_id: String,
        group_name: String,
        welcome_message: Vec<u8>,
        ratchet_tree: Option<Vec<u8>>,
        fanned: Option<Vec<u8>>,
    ) -> Result<()> {
        self.process_invite(ConvoInvite {
            sender_id: sender_id.clone(),
            group_name: group_name.clone(),
            welcome_message: welcome_message.clone(),
            ratchet_tree: ratchet_tree.clone(),
            global_index: 0,
            fanned: fanned.clone(),
        })?;

        Ok(())
    }

    pub fn process_invite(&mut self, invite: ConvoInvite) -> Result<GroupId> {
        // bob can now de-serialize the message as an [`MlsMessageIn`] ...
        let mls_message_in = MlsMessageIn::tls_deserialize(&mut invite.welcome_message.as_slice())
            .context("Failed to deserialize welcome message")?;

        // ... and inspect the message.
        let welcome = match mls_message_in.extract() {
            MlsMessageBodyIn::Welcome(welcome) => welcome,
            // We know it's a welcome message, so we handle all other cases as errors
            _ => bail!("Unexpected message type, expected a Welcome message"),
        };

        let mut ratchet_tree_deserialized: Option<RatchetTreeIn> = None;

        // if we have a ratchet tree:
        if let Some(ratchet_tree) = invite.ratchet_tree {
            ratchet_tree_deserialized = Some(
                RatchetTreeIn::tls_deserialize(&mut ratchet_tree.as_slice())
                    .context("Error deserializing ratchet tree")?,
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
        .context("Error creating a staged join from Welcome")?;

        // Finally, bob can create the group
        let new_group = bob_staged_join
            .into_group(&self.provider)
            .context("Error creating the group from the staged join")?;

        // create the group:
        let group = LocalGroup {
            id: new_group.group_id().to_vec(),
            global_index: invite.global_index.clone(),
            name: invite.group_name.clone(),
            mls_group: new_group,
            decrypted: Vec::new(),
        };

        let group_id = group.mls_group.group_id().to_vec();

        self.groups.insert(group_id.clone(), group);
        Ok(group_id)
    }

    pub fn create_group(&mut self, name: String) -> Result<Vec<u8>> {
        let alice_group = MlsGroup::new(
            &self.provider,
            &self.signer,
            &MlsGroupCreateConfig::default(),
            self.credential_with_key.clone(),
        )
        .context("Failed to create MLS group")?;

        let group = LocalGroup {
            id: alice_group.group_id().to_vec(),
            name: name.clone(),
            mls_group: alice_group,
            global_index: 0,
            decrypted: Vec::new(),
        };
        let group_id = group.mls_group.group_id().to_vec();
        self.groups.insert(group_id.clone(), group);
        Ok(group_id)
    }

    pub fn delete_group(&mut self, group_id: &GroupId) {
        self.groups.remove(group_id);
    }

    pub fn create_invite(
        &mut self,
        group_id: &GroupId,
        serialized_key_package: Vec<u8>,
    ) -> Result<ConvoInvite> {
        let group = self
            .groups
            .get_mut(group_id)
            .context(format!("Group not found for ID: {:?}", group_id))?;

        let mls_group = &mut group.mls_group;

        let key_package_in = KeyPackageIn::tls_deserialize_exact(&serialized_key_package)
            .context("Error deserializing key package")?;

        let key_package = key_package_in
            .validate(self.provider.crypto(), ProtocolVersion::Mls10)
            .context("Invalid KeyPackage")?;

        let (fanned, welcome_out, group_info) = mls_group
            .add_members(&self.provider, &self.signer, &[key_package])
            .context("Could not add members")?;

        // alice merges the pending commit that adds bob.
        mls_group
            .merge_pending_commit(&self.provider)
            .context("Error merging pending commit")?;

        let serialized_welcome = welcome_out
            .tls_serialize_detached()
            .context("Error serializing welcome")?;

        let ratchet_tree = mls_group
            .export_ratchet_tree()
            .tls_serialize_detached()
            .context("Error serializing ratchet tree")?;

        let serialized_fanned = fanned
            .tls_serialize_detached()
            .context("Error serializing fanned")?;

        Ok(ConvoInvite {
            sender_id: self.id.clone(),
            group_name: group.name.clone(),
            welcome_message: serialized_welcome,
            ratchet_tree: Some(ratchet_tree),
            global_index: 1, // TODO: this should be a parameter:
            fanned: Some(serialized_fanned),
        })
    }

    pub fn create_message(&mut self, group_id: &GroupId, message: String) -> Result<Vec<u8>> {
        let group = self
            .groups
            .get_mut(group_id)
            .context(format!("Group not found for ID: {:?}", group_id))?;

        let mls_group = &mut group.mls_group;

        let mls_message_out = mls_group
            .create_message(&self.provider, &self.signer, &message.as_bytes())
            .context("Error creating application message")?;

        mls_message_out
            .to_bytes()
            .context("Failed to serialize message to bytes")
    }

    pub fn process_message(
        &mut self,
        serialized_message: SerializedMessage,
        sender_id: Option<String>,
    ) -> Result<ProcessedResults> {
        let mls_message = MlsMessageIn::tls_deserialize_exact(serialized_message)
            .context("Could not deserialize message")?;

        // decrypt the message:
        let protocol_message: ProtocolMessage = mls_message
            .clone()
            .try_into_protocol_message()
            .context("Expected a PublicMessage or a PrivateMessage")?;

        let group_id = protocol_message.group_id().to_vec();
        let group = self
            .groups
            .get_mut(&group_id)
            .context(format!("Group not found for ID: {:?}", group_id))?;

        let mls_group = &mut group.mls_group;

        let processed_message = mls_group.process_message(&self.provider, protocol_message);

        if let Err(err) = processed_message {
            println!("Error processing message: {:?}", err);
            return Ok(ProcessedResults {
                message: None,
                invite: None,
            });
        }

        let processed_message = processed_message.unwrap();

        let processed_content = processed_message.into_content();
        let processed_results = match processed_content {
            ProcessedMessageContent::ApplicationMessage(msg) => {
                let text = String::from_utf8(msg.into_bytes())
                    .context("Failed to decode message content as UTF-8")?;

                let timestamp = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .context("Failed to get current timestamp")?
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
            ProcessedMessageContent::ProposalMessage(_) => bail!("Unexpected proposal message"),
            ProcessedMessageContent::ExternalJoinProposalMessage(proposal) => {
                mls_group
                    .store_pending_proposal(self.provider.storage(), *proposal)
                    .context("Failed to store pending proposal")?;

                let (_commit, welcome, _group_info) = mls_group
                    .commit_to_pending_proposals(&self.provider, &self.signer)
                    .context("Could not commit to pending proposals")?;

                mls_group
                    .merge_pending_commit(&self.provider)
                    .context("Could not merge commit")?;

                // convert the Option<MlsMessageOut> to MlsMessageOut:
                let welcome = welcome.context("Welcome was not returned")?;

                // serialize the welcome:
                let serialized_welcome = welcome
                    .tls_serialize_detached()
                    .context("Error serializing welcome")?;

                // export the ratchet tree to go along with the invite:
                let ratchet_tree = mls_group
                    .export_ratchet_tree()
                    .tls_serialize_detached()
                    .context("Error serializing ratchet tree")?;

                ProcessedResults {
                    message: None,
                    invite: Some(ConvoInvite {
                        sender_id: self.id.clone(),
                        group_name: group.name.clone(),
                        welcome_message: serialized_welcome,
                        ratchet_tree: Some(ratchet_tree),
                        global_index: group.global_index,
                        fanned: None,
                    }),
                }
            }
            ProcessedMessageContent::StagedCommitMessage(staged_commit) => {
                group
                    .mls_group
                    .merge_staged_commit(&self.provider, *staged_commit)
                    .context("Error merging staged commit")?;

                ProcessedResults {
                    message: None,
                    invite: None,
                }
            }
        };

        Ok(processed_results)
    }

    pub fn kick_member(
        &mut self,
        group_id: GroupId,
        serialized_key_package: Vec<u8>,
    ) -> Result<(SerializedMessage, Option<Vec<u8>>)> {
        let group = self
            .groups
            .get_mut(&group_id)
            .context(format!("Group not found for ID: {:?}", group_id))?;

        let mls_group = &mut group.mls_group;

        let mut member_index: LeafNodeIndex = LeafNodeIndex::new(0);

        // remove the member:
        let (mls_message_out, welcome_option, _group_info) = mls_group
            .remove_members(&self.provider, &self.signer, &[member_index])
            .context("Error kicking member")?;

        // merge the pending commit:
        mls_group
            .merge_pending_commit(&self.provider)
            .context("Error merging pending commit")?;

        // serialize the message & welcome (if it exists)
        let fanned = mls_message_out
            .tls_serialize_detached()
            .context("Error serializing message")?;

        if let Some(welcome) = welcome_option {
            let serialized_welcome = welcome
                .tls_serialize_detached()
                .context("Error serializing welcome")?;

            return Ok((fanned, Some(serialized_welcome)));
        }

        Ok((fanned, None))
    }

    pub fn request_join(&mut self, group_id: &GroupId, epoch: &GroupEpoch) -> Result<Vec<u8>> {
        let key_package_in = KeyPackageIn::tls_deserialize_exact(self.get_key_package()?)
            .context("Error deserializing key package")?;

        let key_package = key_package_in
            .validate(self.provider.crypto(), ProtocolVersion::Mls10)
            .context("Invalid KeyPackage")?;

        let proposal =
            JoinProposal::new::<<OpenMlsRustCrypto as OpenMlsProvider>::StorageProvider>(
                key_package,
                openmls::group::GroupId::from_slice(group_id.as_slice()),
                epoch.clone(),
                &self.signer,
            )
            .context("Could not create external Add proposal")?;

        let serialized_proposal = proposal
            .tls_serialize_detached()
            .context("Error serializing proposal")?;

        Ok(serialized_proposal)
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
    ) -> Result<()> {
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
                self.process_message(msg, Some(message.sender_id))?;
            }

            if let Some(group_id) = group_id {
                let group = self
                    .groups
                    .get_mut(group_id)
                    .context(format!("Group not found for ID: {:?}", group_id))?;

                if message.global_index > group.global_index {
                    group.global_index = message.global_index;
                }
            }
        }

        Ok(())
    }

    pub async fn accept_current_invites(&mut self) -> Result<()> {
        let invites = self.pending_invites.clone();
        for invite in invites {
            self.process_invite(invite)?;
        }
        self.pending_invites.clear();

        Ok(())
    }

    pub fn accept_pending_invite(&mut self, welcome_message: Vec<u8>) -> Result<GroupId> {
        // find the index of the invite in the pending_invites vector:
        let index = self
            .pending_invites
            .iter()
            .position(|i| i.welcome_message == welcome_message);
        if let Some(index) = index {
            let invite = self.pending_invites.remove(index);
            let group_id = self.process_invite(invite)?;
            Ok(group_id)
        } else {
            bail!("Invite not found")
        }
    }

    pub fn reject_pending_invite(&mut self, welcome_message: Vec<u8>) {
        // find the index of the invite in the pending_invites vector:
        let index = self
            .pending_invites
            .iter()
            .position(|i| i.welcome_message == welcome_message);
        if let Some(index) = index {
            self.pending_invites.remove(index);
        }
    }

    // not strictly necessary but helpful functions:
    pub fn group_get_epoch(&mut self, group_id: &GroupId) -> Result<GroupEpoch> {
        let group = self
            .groups
            .get_mut(group_id)
            .context(format!("Group not found for ID: {:?}", group_id))?;

        let mls_group = &mut group.mls_group;

        let epoch = mls_group.epoch();
        Ok(epoch)
    }

    pub fn group_set_index(&mut self, group_id: &GroupId, index: u64) -> Result<()> {
        let group = self
            .groups
            .get_mut(group_id)
            .context(format!("Group not found for ID: {:?}", group_id))?;

        group.global_index = index;
        Ok(())
    }

    pub fn group_get_index(&self, group_id: &GroupId) -> Result<u64> {
        let group = self
            .groups
            .get(group_id)
            .context(format!("Group not found for ID: {:?}", group_id))?;

        Ok(group.global_index)
    }

    pub fn group_push_message(
        &mut self,
        group_id: &GroupId,
        message: String,
        sender_id: String,
    ) -> Result<()> {
        let group = self
            .groups
            .get_mut(group_id)
            .context(format!("Group not found for ID: {:?}", group_id))?;

        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .context("Failed to get current timestamp")?
            .as_millis() as u64;

        group.decrypted.push(MessageItem {
            text: message,
            sender_id,
            timestamp,
        });

        Ok(())
    }

    pub fn group_get_member_ids(&self, group_id: &GroupId) -> Result<Vec<String>> {
        let group = self
            .groups
            .get(group_id)
            .context(format!("Group not found for ID: {:?}", group_id))?;

        let members = group.mls_group.members().collect::<Vec<_>>();

        let mut ids = vec![];
        for member in members {
            let credential = member.credential;
            let credential_bytes = credential.serialized_content().to_vec();
            // convert credential_bytes to a string:
            let credential_str = String::from_utf8(credential_bytes)
                .context("Failed to decode credential as UTF-8")?;

            ids.push(credential_str);
        }

        Ok(ids)
    }

    pub fn get_group_id_with_users(&self, userids: Vec<String>) -> Result<GroupId> {
        // return the first group id that contains exactly the members in userids
        for group in self.groups.values() {
            let member_ids = self.group_get_member_ids(&group.id)?;
            // check if member_ids contains all the userids:
            if member_ids.iter().all(|id| userids.contains(id)) {
                // ensure the lengths are the same:
                if member_ids.len() == userids.len() {
                    return Ok(group.id.clone());
                }
            }
        }

        bail!("No group found with the given users")
    }
}
