use openmls::prelude::{tls_codec::*, *};
use openmls_basic_credential::SignatureKeyPair;
use openmls_rust_crypto::OpenMlsRustCrypto;
use std::collections::HashMap;

use openmls::prelude::{MlsMessageBodyIn, MlsMessageIn};

// A helper to create and store credentials.
pub fn generate_credential_with_key(
  identity: Vec<u8>,
  credential_type: CredentialType,
  signature_algorithm: SignatureScheme,
  provider: &impl OpenMlsProvider,
) -> (CredentialWithKey, SignatureKeyPair) {
  let credential = BasicCredential::new(identity);
  let signature_keys =
      SignatureKeyPair::new(signature_algorithm).expect("Error generating a signature key pair.");

  // Store the signature key into the key store so OpenMLS has access
  // to it.
  signature_keys
      .store(provider.storage())
      .expect("Error storing signature keys in key store.");

  (
      CredentialWithKey {
          credential: credential.into(),
          signature_key: signature_keys.public().into(),
      },
      signature_keys,
  )
}

// A helper to create key package bundles.
pub fn generate_key_package(
  ciphersuite: Ciphersuite,
  provider: &impl OpenMlsProvider,
  signer: &SignatureKeyPair,
  credential_with_key: CredentialWithKey,
) -> KeyPackageBundle {
  // Create the key package
  KeyPackage::builder()
      .build(ciphersuite, provider, signer, credential_with_key)
      .unwrap()
}