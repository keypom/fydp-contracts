use std::fmt;

use crate::*;

/// External data representing assets that should be logged as part of events
#[derive(BorshSerialize, BorshDeserialize, Serialize, Deserialize, Clone, Debug)]
#[borsh(crate = "near_sdk::borsh")]
#[serde(crate = "near_sdk::serde")]
#[serde(untagged)]
pub enum ExtAssetForEvents {
    FTAsset(ExtFTData),
    NearAsset(ExtNEARData),
    NFTAsset(ExtNFTData),
    FCAsset(Vec<ExtFCDataForEvents>),
}

/// Data going into or out of the Keypom contract representing the presence of fungible tokens as an asset for a drop
#[derive(BorshSerialize, BorshDeserialize, Serialize, Deserialize, Clone, Debug)]
#[borsh(crate = "near_sdk::borsh")]
#[serde(crate = "near_sdk::serde")]
pub struct ExtFCDataForEvents {
    /// Contract that will be called
    pub receiver_id: String,
    /// Method to call on receiver_id contract
    pub method_name: String,
    /// Amount of yoctoNEAR to attach along with the call
    pub attached_deposit: U128,
    /// How much gas to attach to this method call.
    pub attached_gas: Gas,
}

/// Enum that represents the data type of the EventLog.
#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "event", content = "data")]
#[serde(rename_all = "snake_case")]
#[serde(crate = "near_sdk::serde")]
#[non_exhaustive]
pub enum EventLogVariant {
    /// Drop creation / deletion
    DropCreation(CreateOrDeleteDropLog),
    DropDeletion(CreateOrDeleteDropLog),

    /// Whenever keys are claimed
    Claim(ClaimLog),
    CreateAccountAndClaim(CreateAccountAndClaimLog),

    /// Whenever keys are added
    AddKey(Vec<AddOrDeleteKeyLog>),
    NftMint(Vec<NftMintLog>),

    /// Whenever keys are deleted
    DeleteKey(Vec<AddOrDeleteKeyLog>),
    NftBurn(Vec<NftBurnLog>),

    /// Whenever keys are transferred
    KeyTransfer(TransferKeyLog),
    NftTransfer(Vec<NftTransferLog>),
}

/// Interface to capture data about an event
///
/// Arguments:
/// * `standard`: name of standard e.g. kpom1
/// * `version`: e.g. 1.0.0
/// * `event`: associate event data
#[derive(Serialize, Deserialize, Debug)]
#[serde(crate = "near_sdk::serde")]
pub struct EventLog {
    pub standard: String,
    pub version: String,

    // `flatten` to not have "event": {<EventLogVariant>} in the JSON, just have the contents of {<EventLogVariant>}.
    #[serde(flatten)]
    pub event: EventLogVariant,
}

impl fmt::Display for EventLog {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_fmt(format_args!(
            "EVENT_JSON:{}",
            &serde_json::to_string(self).map_err(|_| fmt::Error)?
        ))
    }
}
