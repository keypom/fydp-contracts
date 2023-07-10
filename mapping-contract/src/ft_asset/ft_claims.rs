use near_sdk::{Gas, GasWeight, serde_json::json, PromiseResult, require};

use crate::*;

/// Gas needed to execute any logic in the ft claim function
/// 2 TGas + 3 * CCC gas (since there are 3 CCCs)
/// 17 TGas
pub const GAS_FOR_CLAIM_LOGIC: Gas = Gas(2_000_000_000_000 + 3 * MIN_BASE_GAS_FOR_ONE_CCC.0);
/// Minimum Gas required to perform a simple transfer of fungible tokens.
/// 5 TGas
pub const MIN_GAS_FOR_FT_TRANSFER: Gas = Gas(5_000_000_000_000);
/// Minimum Gas required to register a user on the FT contract
/// 5 TGas
pub const MIN_GAS_FOR_STORAGE_DEPOSIT: Gas = Gas(5_000_000_000_000);
/// Minimum Gas required to resolve the batch of promises for transferring the FTs and registering the user.
/// 5 TGas
pub const MIN_GAS_FOR_RESOLVE_BATCH: Gas = Gas(5_000_000_000_000);

impl InternalFTData {
    /// Attempt to transfer FTs to a given address (will cover registration automatically).
    /// If the transfer fails, the FTs will be returned to the available balance
    /// Should *only* be invoked if the available balance is greater than or equal to the transfer amount.
    pub fn claim_ft_asset(&mut self, receiver_id: &AccountId, transfer_amount: &Balance) -> Promise {
        if !self.enough_balance(&transfer_amount) {
            near_sdk::log!("not enough balance to transfer. Found {} but needed {}. Skipping asset claim.", self.balance_avail, transfer_amount);
            return Promise::new(env::current_account_id());
        }
            
        
        // Decrement the available balance and then invoke the transfer
        self.balance_avail -= transfer_amount;

        // Create a new batch promise to pay storage and transfer FTs to the new account ID
        let mut batch_transfer = Promise::new(self.contract_id.clone());

        // Pay the required storage as outlined in the AccountData. This will run first and then we send the fungible tokens
        // Call the function with the min GAS and then attach 1/5 of the unspent GAS to the call
        batch_transfer =  batch_transfer.function_call_weight(
            "storage_deposit".to_string(),
            json!({ "account_id": receiver_id }).to_string().into(),
            self.registration_cost,
            MIN_GAS_FOR_STORAGE_DEPOSIT,
            GasWeight(1),
        );

        // Send the fungible tokens (after the storage attached_deposit is finished since these run sequentially)
        // Call the function with the min GAS and then attach 1/5 of the unspent GAS to the call
        batch_transfer = batch_transfer.function_call_weight(
            "ft_transfer".to_string(),
            json!({ "receiver_id": receiver_id, "amount": transfer_amount.to_string(), "memo": "Keypom FT Tokens" }).to_string().into(),
            1,
            MIN_GAS_FOR_FT_TRANSFER,
            GasWeight(1)
        );

        batch_transfer
    }

    /// Private function that will be called after the FT claim is finished. This will check whether the claim went through successfully.
    /// If it was unsuccessful, the available balance will be incremented (acting as a refund that can then be claimed via refund method)
    pub fn resolve_ft_claim(&mut self, transfer_amount: Balance) -> bool {
        // check whether or not the transfer was successful
        let transfer_succeeded = matches!(env::promise_result(0), PromiseResult::Successful(_));

        if transfer_succeeded {
            return true;
        }

        // If the transfer failed, then we need to increment the available balance
        self.balance_avail += transfer_amount;

        false
    }
}