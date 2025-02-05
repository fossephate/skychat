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

pub struct ProcessedResults {
    pub message: Option<String>,
    pub welcome: Option<Vec<u8>>,
}

pub struct GroupInvite {
    pub fanned: Vec<u8>,
    pub welcome: Vec<u8>,
    pub ratchet_tree: Option<Vec<u8>>,
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
    ) -> GroupInvite {
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
        let fanned = mls_message_out
            .tls_serialize_detached()
            .expect("Error serializing fanned");
        GroupInvite {
            fanned,
            welcome: serialized_welcome,
            ratchet_tree: Some(ratchet_tree),
        }
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
        group_name: String,
        serialized_message: Vec<u8>,
    ) -> ProcessedResults {
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
        let processed_results = match processed_content {
            ProcessedMessageContent::ApplicationMessage(msg) => {
                let message = String::from_utf8(msg.into_bytes()).unwrap();
                ProcessedResults {
                    message: Some(message),
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
        group_name: String,
        key_package: KeyPackageBundle,
    ) -> (Vec<u8>, Option<Vec<u8>>) {
        let group = self.groups.get_mut(&group_name).unwrap();
        let mls_group = &mut group.mls_group;

        let mut member_index: LeafNodeIndex = LeafNodeIndex::new(0);
        // let members = mls_group.members();
        // members.for_each(|m| {
        //     // if m.key_package() == key_package.key_package() {
        //     // }
        //     // TODO: get the member index where key_package matches
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

    pub fn get_joinable_info(&mut self, group_name: String) -> (GroupEpoch, GroupId) {
        let group = self.groups.get_mut(&group_name).unwrap();
        let mls_group = &mut group.mls_group;

        let epoch = mls_group.epoch();
        let group_id = mls_group.group_id();

        (epoch.clone(), group_id.clone())
    }

    pub fn request_join(&mut self, group_id: GroupId, epoch: GroupEpoch) -> Vec<u8> {
        // let group = self.groups.get_mut(&group_name).unwrap();
        // let mls_group = &mut group.mls_group;

        // let epoch = mls_group.epoch();
        let proposal =
            JoinProposal::new::<<OpenMlsRustCrypto as OpenMlsProvider>::StorageProvider>(
                self.get_key_package().key_package().clone(),
                group_id.clone(),
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
