use crate::*;
use models::*;
use near_workspaces::types::{KeyType, PublicKey, SecretKey};
use near_workspaces::Contract;

pub fn sign_kp_message(sk: &near_crypto::SecretKey, nonce: u32, message: &String) -> Base64VecU8 {
    let signature = match sk.sign(&format!("{}{}", message, nonce).as_bytes()) {
        near_crypto::Signature::ED25519(sig) => sig,
        _ => panic!("Invalid signature type"),
    };

    Base64VecU8(signature.to_bytes().to_vec())
}

pub fn verify_kp_signature(
    pk: &near_crypto::PublicKey,
    sig: &near_crypto::Signature,
    nonce: u32,
    message: &String,
) -> bool {
    let msg = format!("{}{}", message, nonce);
    sig.verify(msg.as_bytes(), pk)
}

pub async fn get_sig_meta(contract: Contract) -> Result<SignatureMeta, anyhow::Error> {
    let global_sk = contract
        .view("get_global_secret_key")
        .await?
        .json::<String>()?;
    let message = contract
        .view("get_signing_message")
        .await?
        .json::<String>()?;

    let sk: SecretKey = global_sk.parse().unwrap();
    Ok(SignatureMeta {
        message,
        secret_key: sk,
    })
}

pub async fn get_drop_info(contract: Contract, drop_id: String) -> Result<ExtDrop, anyhow::Error> {
    let drop_info = contract
        .view("get_drop_information")
        .args_json(json!({"drop_id": drop_id}))
        .await?
        .json::<ExtDrop>()?;

    Ok(drop_info)
}

pub async fn get_key_info(
    contract: &Contract,
    key: PublicKey,
    should_exist: bool,
) -> Result<Option<ExtKeyInfo>, anyhow::Error> {
    let key_info = contract
        .view("get_key_information")
        .args_json(json!({"key": key}))
        .await;

    if !should_exist {
        assert!(key_info.is_err());
        return Ok(None);
    } else {
        assert!(key_info.is_ok())
    }

    Ok(Some(key_info?.json::<ExtKeyInfo>()?))
}

pub fn generate_keypairs(num_keys: u16) -> Vec<SecretKey> {
    let mut sks = vec![];

    for _ in 0..num_keys {
        // Generate a keypair
        sks.push(SecretKey::from_random(KeyType::ED25519));
    }

    sks
}
