import {
  artworkUrls,
  descriptions,
  eventDescriptions,
  eventNames,
  locations,
  questionResponses,
  questions,
  ticketArtworkUrls,
  ticketTypes,
} from "./dummyData";
import {
  DateAndTimeInfo,
  FunderMetadata,
  QuestionInfo,
  ZombieDropMetadata,
  ZombieReturnedEvent,
} from "./interfaces";
import * as crypto from "crypto";
import { EventInfo, EventStyles } from "./EventStyleInterfaces";

const {
  KeyPair,
  connect,
  utils,
  InMemorySigner,
  transactions,
  keyStores,
} = require("near-api-js");
const fs = require("fs");
const path = require("path");
const homedir = require("os").homedir();

const CREDENTIALS_DIR = ".near-credentials";
const credentialsPath = path.join(homedir, CREDENTIALS_DIR);
const keyStore = new keyStores.UnencryptedFileSystemKeyStore(credentialsPath);

const config = {
  keyStore,
  networkId: "testnet",
  nodeUrl: "https://rpc.testnet.near.org",
};

export async function initNear() {
  const near = await connect({ ...config, keyStore });
  return near;
}

// Delay function
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function sendTransaction({
  signerAccount,
  receiverId,
  methodName,
  args,
  deposit,
  gas,
  wasmPath = undefined,
}: {
  signerAccount: any;
  receiverId: string;
  methodName: string;
  args: any;
  deposit: string;
  gas: string;
  wasmPath?: string;
}) {
  console.log(
    "Sending transaction... with deposit",
    utils.format.parseNearAmount(deposit),
  );
  const result = await signerAccount.signAndSendTransaction({
    receiverId: receiverId,
    actions: [
      ...(wasmPath
        ? [transactions.deployContract(fs.readFileSync(wasmPath))]
        : []),
      transactions.functionCall(
        methodName,
        Buffer.from(JSON.stringify(args)),
        gas,
        utils.format.parseNearAmount(deposit),
      ),
    ],
  });

  console.log(result);
}

export async function createContracts({
  signerAccount,
  near,
  marketplaceContractId,
  keypomContractId,
  factoryContractId,
}: {
  signerAccount: any;
  near: any;
  marketplaceContractId: string;
  keypomContractId: string;
  factoryContractId: string;
}) {
  const keyPair = KeyPair.fromRandom("ed25519");
  const publicKey = keyPair.publicKey.toString();
  await createAccountDeployContract({
    signerAccount,
    newAccountId: keypomContractId,
    amount: "200",
    near,
    wasmPath: "./out/keypom.wasm",
    methodName: "new",
    args: {
      root_account: "testnet",
      owner_id: keypomContractId,
      signing_pk: publicKey,
      signing_sk: keyPair.secretKey,
      message: "Keypom is lit!",
    },
    deposit: "0",
    gas: "300000000000000",
  });

  await createAccountDeployContract({
    signerAccount,
    newAccountId: marketplaceContractId,
    amount: "200",
    near,
    wasmPath: "./out/marketplace.wasm",
    methodName: "new",
    args: {
      keypom_contract: keypomContractId,
      owner_id: "minqi.testnet",
      v2_keypom_contract: "v2.keypom.testnet",
    },
    deposit: "0",
    gas: "300000000000000",
  });

  let starting_near_balance: Record<string, string> = {};
  starting_near_balance["explorer_pass"] = utils.format.parseNearAmount("1");
  starting_near_balance["piranha_pass"] = utils.format.parseNearAmount("1");
  let starting_token_balance: Record<string, string> = {};
  starting_token_balance["explorer_pass"] = utils.format.parseNearAmount("50");
  starting_token_balance["piranha_pass"] = utils.format.parseNearAmount("250");

  await createAccountDeployContract({
    signerAccount,
    newAccountId: factoryContractId,
    amount: "200",
    near,
    wasmPath: "./out/factory.wasm",
    methodName: "new",
    args: {
      starting_near_balance,
      starting_token_balance,
      keypom_contract: keypomContractId,
      token_name: "Consensus Token",
      symbol: "DESK",
    },
    deposit: "0",
    gas: "300000000000000",
    createDrop: true,
  });
}

export async function createAccountDeployContract({
  signerAccount,
  newAccountId,
  amount,
  near,
  wasmPath,
  methodName,
  args,
  deposit = "0",
  gas = "300000000000000",
  createDrop = false,
}: {
  signerAccount: any;
  newAccountId: string;
  amount: string;
  near: any;
  wasmPath: string;
  methodName: string;
  args: any;
  deposit?: string;
  gas?: string;
  createDrop?: boolean;
}) {
  console.log("Creating account: ", newAccountId);
  await createAccount({ signerAccount, newAccountId, amount });
  console.log("Deploying contract: ", newAccountId);
  const accountObj = await near.account(newAccountId);
  await sendTransaction({
    signerAccount: accountObj,
    receiverId: newAccountId,
    methodName,
    args,
    deposit,
    gas,
    wasmPath,
  });

  if (createDrop) {
    let drops = [
      {
        id: "illia_talk",
        amount: utils.format.parseNearAmount("50"),
        name: "Illia's Talk",
        image: "desk.png",
      },
      {
        id: "near_sponsor_scavenger_1",
        scavenger_ids: ["foo", "bar"],
        amount: utils.format.parseNearAmount("100"),
        name: "NEAR Sponsor Scavenger Hunt",
        image: "near_scavenger.jpg",
      },
      {
        id: "scavenger_2",
        scavenger_ids: ["foo", "bar", "baz", "biz"],
        amount: utils.format.parseNearAmount("100"),
        name: "Avalanche Sponsor Scavenger Hunt",
        image: "av_logo.png",
      },
      {
        id: "scavenger_3",
        scavenger_ids: ["foo", "bar", "baz", "biz", "bop", "blah", "blez"],
        amount: utils.format.parseNearAmount("100"),
        name: "Consensus Official Scavenger Hunt",
        image: "desk.png",
      },
      {
        id: "scavenger_4",
        scavenger_ids: ["foo", "bar"],
        amount: utils.format.parseNearAmount("100"),
        name: "Proximity After Party",
        image: "proximity.jpg",
      },
      {
        id: "poap_1",
        name: "Stellar Booth POAP",
        image: "stellar.png",
        contract_id: "foo",
        method: "bar",
        args: "baz",
      },
      {
        id: "poap_2",
        name: "NEAR Booth POAP",
        image: "near_scavenger.jpg",
        contract_id: "foo",
        method: "bar",
        args: "baz",
      },
      {
        id: "poap_3",
        name: "Scavenger Hunt POAP",
        image: "consensus_logo.png",
        contract_id: "foo",
        method: "bar",
        args: "baz",
      },
    ];
    console.log("Creating drop: ", newAccountId);
    await sendTransaction({
      signerAccount: accountObj,
      receiverId: newAccountId,
      methodName: "create_drop_batch",
      args: {
        drops,
      },
      deposit: "0",
      gas,
    });
  }

  console.log("Deployed.");
}

export async function createAccount({
  signerAccount,
  newAccountId,
  amount,
}: {
  signerAccount: any;
  newAccountId: string;
  amount: string;
}) {
  // const keyPair = KeyPair.fromRandom("ed25519");
  const keyPair = KeyPair.fromString(
    "ed25519:2vQcYHvPqBrzTnAyeWVConoYVRR25dwj2UNqPXkWrU88L47B1FoWZaXXwWtr7hBFBge5pFwTdYzjtrUN8pTKpsxY",
  );
  const publicKey = keyPair.publicKey.toString();
  await keyStore.setKey(config.networkId, newAccountId, keyPair);

  return await signerAccount.functionCall({
    contractId: "testnet",
    methodName: "create_account",
    args: {
      new_account_id: newAccountId,
      new_public_key: publicKey,
    },
    gas: "300000000000000",
    attachedDeposit: utils.format.parseNearAmount(amount),
  });
}

export function generateEvents(numEvents = 40) {
  function generateDateInfo(): DateAndTimeInfo {
    const startDate = new Date(2025, 2, 23);
    const endDate = new Date(2025, 3, 3);

    return {
      startDate: startDate.getTime(),
      endDate: endDate.getTime(),
    };
  }

  let events: ZombieReturnedEvent[] = [];
  for (let i = 0; i < numEvents; i++) {
    const eventName = `Eth Denver 2025`;
    const eventId = crypto.randomUUID().toString();
    const styles: EventStyles = {
      title: {
        color: "white",
        fontFamily: "ConsensusTitle",
        fontSize: { base: "5xl", md: "8xl" },
      },
      h1: {
        color: "#2DD0CD",
        fontFamily: "ConsensusHeading",
        fontWeight: "600",
        fontSize: { base: "lg", md: "2xl" },
      },
      h2: {
        color: "#020A0A",
        fontFamily: "ConsensusHeading",
        fontWeight: "500",
        fontSize: { base: "lg", md: "2xl" },
      },
      h3: {
        color: "#020A0A",
        fontFamily: "ConsensusHeading",
        fontWeight: "400",
        fontSize: { base: "lg", md: "2xl" },
      },
      buttons: {
        primary: {
          bg: "#C936F6",
          color: "white",
          fontFamily: "ConsensusHeading",
          fontSize: "2xl",
          fontWeight: "500",
          h: "48px",
          sx: { _hover: { backgroundColor: "#C936F6" } },
        },
        secondary: {
          bg: "gray.200",
          color: "black",
          fontFamily: "ConsensusHeading",
          fontSize: "2xl",
          fontWeight: "500",
          h: "48px",
          sx: { _hover: { backgroundColor: "gray.300" } },
        },
      },
      border: {
        border:
          "linear-gradient(white, white) padding-box, linear-gradient(0deg, rgba(45, 208, 205,1) 0%, rgba(201, 54, 246,1) 100%) border-box",
      },
      icon: {
        image: "consensus_logo.png",
        bg: "#020A0A",
        border: "#C936F6",
      },
      background: "background.png",
    };

    const eventInfo: EventInfo = {
      name: eventName,
      dateCreated: Date.now().toString(),
      id: eventId,
      description: `ETHDenver celebrates the convergence of blockchain, culture, and education. Located in the heart of Denver, Colorado, ETHDenver is the premiere destination for #BUIDLing the decentralized future..`,
      location: `4655 Humboldt St, Denver CO 80216`,
      date: {
        startDate: new Date(2025, 2, 23).getTime(),
        endDate: new Date(2025, 3, 3).getTime(),
      },
      artwork: "bafybeibadywqnworqo5azj4rume54j5wuqgphljds7haxdf2kc45ytewpy",
      styles,
      qrPage: {
        showTitle: false,
        showLocation: false,
        showDate: false,
        dateUnderQR: true,
        showDownloadButton: false,
        showSellTicketButton: true,
        sellableThroughText: false,
      },
      welcomePage: {
        title: {
          text: "Consensus 2025",
          fontSize: { base: "2xl", md: "3xl" },
        },
      },
      questions: questions,
      nearCheckout: true,
    };

    let tickets: ZombieDropMetadata[] = [];
    // tickets.push(
    //   {
    //   name: `Member GA`,
    //   eventId,
    //   description: `Non Refundable. Non-Transferrable.%CHECKLIST%Fourteen-day full event pass%ITEM%Access to applications to contribute%ITEM%Access to pre-event Discord%ITEM%Access to Official ETHDenver Parties%ITEM%SporkDAO Member Airdrops%ITEM%Earn $Spork by Contributing%ITEM%ETHDenver Swag + Discounts%END%`,
    //   salesValidThrough: {
    //     startDate: Date.now(),
    //     endDate: new Date(2025, 3, 3).getTime(),
    //   },
    //   passValidThrough: {
    //     startDate: Date.now(),
    //     endDate: new Date(2025, 3, 3).getTime(),
    //   },
    //   price: "0",
    //   artwork: "bafkreiand5pmov7dr74yfonwgetp5lmvvklwwatqmqt63heaovfb5tt6ly",
    //   maxSupply: 25000,
    //   dateCreated: new Date().toISOString(),
    // });
    tickets.push({
      name: `Explorer Pass`,
      eventId,
      description: `Non Refundable. Non-Transferrable.%CHECKLIST%Fourteen-day full event pass%ITEM%Access to applications to contribute%ITEM%Access to pre-event Discord%ITEM%Access to Official ETHDenver Parties%ITEM%ETHDenver Swag%END%`,
      salesValidThrough: {
        startDate: Date.now(),
        endDate: new Date(2025, 3, 3).getTime(),
      },
      passValidThrough: {
        startDate: Date.now(),
        endDate: new Date(2025, 3, 3).getTime(),
      },
      priceUSD: "59900",
      price: utils.format.parseNearAmount("10"),
      artwork: "explorer_pass.png",
      maxSupply: 25000,
      dateCreated: new Date().toISOString(),
      dropId: "explorer_pass",
    });
    tickets.push({
      name: `Piranha Pass`,
      eventId,
      description: `Non Refundable. Non-Transferrable.%CHECKLIST%Everything in GA and...%ITEM%VIP Entrance (shorter wait)%ITEM%SporkWhale VIP Loung w/ light snacks and beverages%ITEM%Front Row Seating at Stages%ITEM%Official Parties SporkWhale Viewing%ITEM%Requires NFT to Access Lounge%END%`,
      salesValidThrough: {
        startDate: Date.now(),
        endDate: new Date(2025, 3, 3).getTime(),
      },
      passValidThrough: {
        startDate: Date.now(),
        endDate: new Date(2025, 3, 3).getTime(),
      },
      priceUSD: "250000",
      price: utils.format.parseNearAmount("10"),
      artwork: "piranha_pass.png",
      maxSupply: 25000,
      dateCreated: new Date().toISOString(),
      dropId: "piranha_pass",
    });

    events.push({
      eventMeta: eventInfo,
      tickets: tickets,
    });
  }

  return events;
}

export function uint8ArrayToBase64(u8Arr: Uint8Array): string {
  const string = u8Arr.reduce(
    (data, byte) => data + String.fromCharCode(byte),
    "",
  );
  return btoa(string);
}

export async function generateKeyPair(): Promise<{
  privateKey: any;
  publicKey: any;
}> {
  return await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: { name: "SHA-256" },
    },
    true,
    ["encrypt", "decrypt"],
  );
}

export async function encryptWithPublicKey(
  data: string,
  publicKey: any,
): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
    },
    publicKey,
    encoded,
  );

  return uint8ArrayToBase64(new Uint8Array(encrypted));
}

export async function deriveKeyFromPassword(
  password: string,
  saltBase64: string,
): Promise<any> {
  // Convert Base64-encoded salt back to Uint8Array
  const salt = Uint8Array.from(atob(saltBase64), (c) => c.charCodeAt(0));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}

export async function encryptPrivateKey(
  privateKey: any,
  symmetricKey: any,
): Promise<{ encryptedPrivateKeyBase64: string; ivBase64: string }> {
  const exportedPrivateKey = await crypto.subtle.exportKey("pkcs8", privateKey);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedPrivateKey = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    symmetricKey,
    exportedPrivateKey,
  );

  const encryptedBase64 = uint8ArrayToBase64(
    new Uint8Array(encryptedPrivateKey),
  );
  const ivBase64 = uint8ArrayToBase64(iv);

  return { encryptedPrivateKeyBase64: encryptedBase64, ivBase64 };
}

export async function decryptPrivateKey(
  encryptedPrivateKeyBase64: string,
  ivBase64: string,
  symmetricKey: any,
): Promise<any> {
  const encryptedPrivateKey = Uint8Array.from(
    atob(encryptedPrivateKeyBase64),
    (c) => c.charCodeAt(0),
  );
  const iv = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0));

  const decryptedPrivateKeyBuffer = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    symmetricKey,
    encryptedPrivateKey,
  );

  return crypto.subtle.importKey(
    "pkcs8",
    decryptedPrivateKeyBuffer,
    {
      name: "RSA-OAEP",
      hash: { name: "SHA-256" },
    },
    true,
    ["decrypt"],
  );
}

export async function decryptWithPrivateKey(
  encryptedData: string,
  privateKey: any,
): Promise<string> {
  const encryptedDataArrayBuffer = Uint8Array.from(atob(encryptedData), (c) =>
    c.charCodeAt(0),
  ).buffer;

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "RSA-OAEP",
    },
    privateKey,
    encryptedDataArrayBuffer,
  );

  return new TextDecoder().decode(decrypted);
}

export async function exportPublicKeyToBase64(publicKey: any) {
  // Export the key to the SPKI format
  const exportedKey = await crypto.subtle.exportKey("spki", publicKey);

  // Convert the exported key to a Base64 string
  const base64Key = arrayBufferToBase64(exportedKey);

  return base64Key;
}

export function arrayBufferToBase64(buffer: any) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function base64ToPublicKey(base64Key: string) {
  // Decode the Base64 string to an ArrayBuffer
  const binaryString = atob(base64Key);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Import the key from the ArrayBuffer
  const publicKey = await crypto.subtle.importKey(
    "spki",
    bytes.buffer,
    {
      name: "RSA-OAEP",
      hash: { name: "SHA-256" },
    },
    true,
    ["encrypt"],
  );

  return publicKey;
}

export const addTickets = async ({
  signerAccount,
  funderAccountId,
  keypomAccountId,
  marketplaceAccount,
  dropId,
  ticket,
  eventId,
  eventQuestions,
}: {
  signerAccount: any;
  funderAccountId: string;
  keypomAccountId: string;
  marketplaceAccount: any;
  dropId: string;
  ticket: ZombieDropMetadata;
  eventId: string;
  eventQuestions?: QuestionInfo[];
}): Promise<string[]> => {
  const maxSupply = ticket.maxSupply || 100;
  let numTickets = 25;
  numTickets = Math.min(numTickets, maxSupply);

  let keyData: {
    public_key: string;
    metadata: string;
    key_owner?: string;
  }[] = [];
  let keyPairs: string[] = [];

  const funderInfo = await signerAccount.viewFunction(
    keypomAccountId,
    "get_funder_info",
    { account_id: funderAccountId },
  );

  const funderMeta: FunderMetadata = JSON.parse(funderInfo.metadata);
  // console.log("Funder Metadata: ", funderMeta);
  const eventInfo = funderMeta[eventId];

  let pubKey;
  if (eventInfo.pubKey !== undefined) {
    pubKey = await base64ToPublicKey(eventInfo.pubKey);
    console.log("Public Key: ", pubKey);
  }

  for (let i = 0; i < numTickets; i++) {
    const keyPair = KeyPair.fromRandom("ed25519");
    keyPairs.push(keyPair.toString());
    const publicKey = keyPair.publicKey.toString();
    const questions = eventQuestions || [];

    let answers: { [key: string]: string } = {};
    for (const question of questions) {
      if (question.required || Math.random() > 0.8) {
        const randomIndex = Math.floor(
          Math.random() * questionResponses[question.question].length,
        );
        answers[question.question] = `${
          questionResponses[question.question][randomIndex]
        }`;
      }
    }

    let metadata = JSON.stringify({ questions: answers });
    if (pubKey !== undefined) {
      metadata = await encryptWithPublicKey(metadata, pubKey);
      // console.log("Encrypted Metadata: ", metadata);
    }

    keyData.push({
      public_key: publicKey,
      metadata,
    });
  }

  await delay(1000); // Delay to prevent nonce retries exceeded error

  try {
    await sendTransaction({
      signerAccount: marketplaceAccount,
      receiverId: keypomAccountId,
      methodName: "add_keys",
      args: {
        drop_id: dropId,
        key_data: keyData,
      },
      deposit: "5",
      gas: "300000000000000",
    });
    return keyPairs;
  } catch (e) {
    console.log("(Add Tix) ERROR!!!: ", e);
  }
  return [];
};

// async function foo() {
//   // Generate a random key pair
//   const { publicKey, privateKey } = await generateKeyPair();
//
//   // Step 2: Encrypt data using the public key
//   const encryptedData = await encryptWithPublicKey(dataToEncrypt, publicKey);
//   console.log("Encrypted Data:", encryptedData);
//
//   // Step 3: Derive a symmetric key from the password
//   const saltHex = crypto.randomBytes(16).toString("hex");
//   const symmetricKey = await deriveKeyFromPassword(masterKey, saltHex);
//
//   // Step 4: Encrypt the private key using the symmetric key
//   const { encryptedPrivateKeyBase64, ivBase64 } = await encryptPrivateKey(
//     privateKey,
//     symmetricKey,
//   );
//   console.log("Encrypted Private Key:", encryptedPrivateKeyBase64);
//
//   // Simulate storing and later retrieving the encrypted private key and iv
//   const storedEncryptedPrivateKey = encryptedPrivateKeyBase64;
//   const storedIv = ivBase64;
//
//   // Step 5: Decrypt the private key using the symmetric key
//   const decryptedPrivateKey = await decryptPrivateKey(
//     storedEncryptedPrivateKey,
//     storedIv,
//     symmetricKey,
//   );
//
//   // Step 6: Decrypt the encrypted data using the decrypted private key
//   const decryptedData = await decryptWithPrivateKey(
//     encryptedData,
//     decryptedPrivateKey,
//   );
//   console.log("Decrypted Data:", decryptedData);
// }
