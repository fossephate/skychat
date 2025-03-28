use std::time::{SystemTime, UNIX_EPOCH};

use openmls::prelude::{tls_codec::Serialize as TlsSerialize, *};
use openmls_basic_credential::SignatureKeyPair;
use serde_json;
use anyhow::{Context, Result};
// A helper to create and store credentials.
pub fn generate_credential_with_key(
    identity: Vec<u8>,
    _credential_type: CredentialType,
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

pub fn current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
}

use base64::{engine::general_purpose, Engine as _};
use serde::{de::DeserializeOwned, Deserialize, Deserializer, Serialize, Serializer};
use std::error::Error;

pub struct BufferConverter;
impl BufferConverter {
    /// Converts a byte slice to a base64 string
    ///
    /// # Arguments
    /// * `buffer` - The byte slice to convert
    ///
    /// # Returns
    /// A String containing the base64 encoded data
    pub fn to_base64(buffer: &[u8]) -> String {
        general_purpose::URL_SAFE.encode(buffer)
    }

    /// Converts a base64 string back to a Vec<u8>
    ///
    /// # Arguments
    /// * `base64` - The base64 string to convert
    ///
    /// # Returns
    /// Result containing either the decoded bytes or an error
    pub fn from_base64(base64: &str) -> Result<Vec<u8>> {
        general_purpose::URL_SAFE
            .decode(base64)
            .context("Failed to decode base64 string")
    }

    /// Serializes a JSON-serializable type to a base64 string
    ///
    /// # Arguments
    /// * `value` - The value to serialize
    ///
    /// # Returns
    /// Result containing either the base64 encoded string or an error
    pub fn to_base64_json<T: Serialize>(value: &T) -> Result<String> {
        let json = serde_json::to_vec(value)
            .context("Failed to serialize value to JSON")?;
        Ok(Self::to_base64(&json))
    }

    /// Deserializes a base64 string to a JSON-serializable type
    ///
    /// # Arguments
    /// * `base64` - The base64 string to deserialize
    ///
    /// # Returns
    /// Result containing either the deserialized value or an error
    pub fn from_base64_json<T: DeserializeOwned>(base64: &str) -> Result<T> {
        let bytes = Self::from_base64(base64)?;
        serde_json::from_slice(&bytes)
            .context("Failed to deserialize JSON from base64 string")
    }
}


pub fn extract_sender_id_from_credential(credential: Credential) -> Result<String> {
    let sender_id_bytes = credential.tls_serialize_detached().context("Failed to serialize sender id")?;
    let sender_id = String::from_utf8(sender_id_bytes).context("Failed to convert sender id to string")?;
    Ok(sender_id)
}