// There is no standard way of sending the funder FTs unless we expose a private key in script. For this reason, the script will only work if the funder has enough FTs.
const { parseNearAmount, formatNearAmount } = require("near-api-js/lib/utils/format");
const path = require("path");
const homedir = require("os").homedir();
const { writeFile, mkdir, readFile } = require('fs/promises');
const { initiateNearConnection, getFtCosts, estimateRequiredDeposit, ATTACHED_GAS_FROM_WALLET, getRecentDropId } = require("../utils/general");
const { FUNDING_ACCOUNT_ID, NETWORK_ID, NUM_KEYS, DROP_METADATA, DEPOSIT_PER_USE_NEAR, DROP_CONFIG, KEYPOM_CONTRACT, FT_DATA, FT_CONTRACT_ID } = require("./configurations");
const { KeyPair } = require("near-api-js");
const { BN } = require("bn.js");

async function start() {
	// Initiate connection to the NEAR blockchain.
	console.log("Initiating NEAR connection");
	let near = await initiateNearConnection(NETWORK_ID);
	const fundingAccount = await near.account(FUNDING_ACCOUNT_ID);

	//get amount to transfer and see if owner has enough balance to fund drop
	let amountToTransfer = new BN(FT_DATA.balancePerUse).mul(new BN(NUM_KEYS * DROP_CONFIG.usesPerKey)).toString()
	console.log('amountToTransfer: ', amountToTransfer);	
	if (await FT_CONTRACT_ID.ft_balance_of({ account_id: FUNDING_ACCOUNT_ID }).toString() < amountToTransfer){
		throw new Error('funder does not have enough Fungible Tokens for this drop. Top up and try again.');
	}

	let requiredDeposit = await estimateRequiredDeposit(
		near,
		DEPOSIT_PER_USE_NEAR,
		NUM_KEYS,
		DROP_CONFIG.uses_per_key,
		ATTACHED_GAS_FROM_WALLET,
		parseNearAmount("0.1"),
		null,
		FT_DATA
	)
	
	// Keep track of an array of the keyPairs we create
	let keyPairs = [];
	// Keep track of the public keys to pass into the contract
	let pubKeys = [];
	console.log("Creating keypairs");
	for(var i = 0; i < NUM_KEYS; i++) {
		let keyPair = await KeyPair.fromRandom('ed25519'); 
		keyPairs.push(keyPair);   
		pubKeys.push(keyPair.publicKey.toString());   
	}

	try {
		await fundingAccount.functionCall(
			KEYPOM_CONTRACT, 
			'create_drop', 
			{
				public_keys: pubKeys,
				deposit_per_use: DEPOSIT_PER_USE_NEAR,
				config: DROP_CONFIG,
				metadata: JSON.stringify(DROP_METADATA),
				ft_data: FT_DATA
			}, 
			"300000000000000"
		);
	} catch(e) {
		console.log('error creating drop: ', e);
	}

	try {
		await fundingAccount.functionCall(
			FT_CONTRACT_ID, 
			'storage_deposit',
			{
				account_id: FUNDING_ACCOUNT_ID,
			},
			"300000000000000",
			parseNearAmount("0.1")
		);

		let dropId = await getRecentDropId(fundingAccount, FUNDING_ACCOUNT_ID, KEYPOM_CONTRACT);
		console.log('dropId: ', dropId)

		await fundingAccount.functionCall(
			FT_CONTRACT_ID, 
			'ft_transfer_call', 
			{
				receiver_id: KEYPOM_CONTRACT,
				amount: amountToTransfer,
				msg: dropId.toString()
			},
			"300000000000000",
			"1"
		);
	} catch(e) {
		console.log('error sending FTs', e);
	}
	
	let curPks = {};
	for(var i = 0; i < keyPairs.length; i++) {
		let linkdropUrl = NETWORK_ID == "testnet" ? `https://testnet.mynearwallet.com/linkdrop/${KEYPOM_CONTRACT}/${keyPairs[i].secretKey}` : `https://mynearwallet.com/linkdrop/${KEYPOM_CONTRACT}/${keyPairs[i].secretKey}`;
		curPks[keyPairs[i].publicKey.toString()] = linkdropUrl;
		console.log(linkdropUrl);
	}

	console.log('curPks: ', curPks)
	await writeFile(path.resolve(__dirname, `pks.json`), JSON.stringify(curPks));
}

start();