use crate::*;

#[derive(BorshSerialize, BorshDeserialize, Serialize, Deserialize, Clone, Debug)]
#[borsh(crate = "near_sdk::borsh")]
#[serde(crate = "near_sdk::serde")]
pub struct NftTransferMemo {
    pub linkdrop_pk: PublicKey,
    pub signature: Option<Base64VecU8>,
    pub new_public_key: PublicKey,
}

#[near_bindgen]
impl Keypom {
    /// Transfers an NFT key from one user to another.
    /// If *token_id* is passed in, we use that token ID. Otherwise, we use the token ID associated with the sender's public key
    /// If *receiver_id* is passed in, we transfer the token to that account. Otherwise, we transfer the token to the current account.
    /// This functionality is added in case you want to transfer to someone who doesn't have a NEAR wallet.
    /// The *memo* field is the new public key that the token will be associated with.
    #[payable]
    pub fn nft_transfer(
        &mut self,
        receiver_id: Option<AccountId>,
        approval_id: Option<u64>,
        memo: String,
    ) {
        self.assert_no_global_freeze();
        // Deserialize the msg string into the NftApproveMsg struct
        let nft_transfer_memo: NftTransferMemo =
            serde_json::from_str(&memo).expect("Invalid message format");
        let NftTransferMemo {
            linkdrop_pk,
            signature,
            new_public_key: new_pk,
        } = nft_transfer_memo;

        let sender_id = env::predecessor_account_id();

        if env::signer_account_pk() == linkdrop_pk {
            // All args, unfilled options will be filtered out
            let mut args_json = json!({
                "receiver_id": receiver_id.clone().map(|id| json!(id)),
                "approval_id": approval_id.map(|id| json!(id)),
                "memo": json!({
                    "linkdrop_pk": linkdrop_pk,
                    "new_public_key": new_pk
                }).to_string(),
            });
            
            if let Some(obj) = args_json.as_object_mut() {
                obj.retain(|_, v| !v.is_null());
            }

            let args_string = args_json.to_string();
        
            require!(
                self.verify_signature(signature.expect("Missing signature"), linkdrop_pk.clone(), args_string),
                "Invalid signature for public key"
            );
        }

        // Token ID is either from sender PK or passed in
        let token_id = self
            .token_id_by_pk
            .get(&linkdrop_pk)
            .expect("Token ID not found for Public Key");
        self.internal_transfer(sender_id, receiver_id, token_id, approval_id, new_pk);
    }

    /// Get the token object info for a specific token ID
    pub fn nft_token(&self, token_id: TokenId) -> Option<ExtNFTKey> {
        let drop_id = parse_token_id(&token_id).unwrap().0;

        if let Some(drop) = self.drop_by_id.get(&drop_id) {
            let NFTKeyConfigurations {
                token_metadata,
                royalties,
            } = drop
                .config
                .and_then(|c| c.nft_keys_config)
                .unwrap_or(NFTKeyConfigurations {
                    token_metadata: None,
                    royalties: None,
                });

            if let Some(key_info) = drop.key_info_by_token_id.get(&token_id) {
                return Some(ExtNFTKey {
                    token_id,
                    owner_id: key_info.owner_id.unwrap_or(env::current_account_id()),
                    metadata: token_metadata.unwrap_or(TokenMetadata {
                        title: Some(String::from("Keypom Access Key")),
                        description: Some(String::from("Keypom is pretty lit")),
                        media: Some(String::from(
                            "bafybeibwhlfvlytmttpcofahkukuzh24ckcamklia3vimzd4vkgnydy7nq",
                        )),
                        media_hash: None,
                        copies: None,
                        issued_at: None,
                        expires_at: None,
                        starts_at: None,
                        updated_at: None,
                        extra: None,
                        reference: None,
                        reference_hash: None,
                    }),
                    approved_account_ids: key_info.approved_account_ids.clone(),
                    royalty: royalties.unwrap_or_default(),
                });
            }
        }

        None
    }
}
