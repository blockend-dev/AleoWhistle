import { CID } from 'multiformats/cid';
import { Address,Account } from '@provablehq/sdk';

export async function hashContent(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer)).slice(0, 31);
  let result = BigInt(0);
  for (const byte of hashArray) {
    result = (result << BigInt(8)) + BigInt(byte);
  }
  return `${result}field`;
}

// Generates a random BigInt
export function generateSeed(): string {
  const bytes = window.crypto.getRandomValues(new Uint8Array(31));
  let result = BigInt(0);
  for (const byte of bytes) {
    result = (result << BigInt(8)) + BigInt(byte);
  }
  return result.toString();
}

export async function encryptKeyForAddress(caseKeyField: string, recipientAddress: string) {
  const ephemeral = new Account();
  const ephemeralScalar = ephemeral.privateKey().to_view_key().to_scalar();
  
  const recipient = Address.from_string(recipientAddress);
  const recipientGroup = recipient.toGroup();
  
  const sharedSecret = recipientGroup.scalarMultiply(ephemeralScalar);
  
  const keyBI = BigInt(caseKeyField);
  const secretBI = BigInt(sharedSecret.toString());
  
  /** * SAFETY CHECK:
   * Aleo Fields are roughly 252 bits. 
   * If (keyBI ^ secretBI) is too large, the Leo contract will crash.
   * We mask it to 250 bits to be absolutely safe.
   */
  const mask = (BigInt(1) << BigInt(250)) - BigInt(1);
  const encryptedKey = ((keyBI ^ secretBI) & mask).toString();
  
  // Also convert the ephemeral address to its Field representation 
  // so it fits into the 'ephemeral_key: field' input.
  const ephemeralField = addressToField(ephemeral.address().to_string());
  
  return {
    encryptedKey, 
    ephemeralPublicKey: ephemeralField
  };
}

export function addressToField(addressStr: string): string {
  return Address.from_string(addressStr).toFields ().toString();
}

// Converts IPFS CID to a single Aleo Field 
export function cidToAleoField(cidString: string): string {
  try {
    const cid = CID.parse(cidString);
    const digest = cid.multihash.digest;
    let result = BigInt(0);
    for (let i = 0; i < 31; i++) {
      result = (result << BigInt(8)) + BigInt(digest[i]);
    }
    return `${result}field`;
  } catch (e) {
    return "0field";
  }
}

  export function generate31ByteKey(): string {
  const bytes = window.crypto.getRandomValues(new Uint8Array(31));
  
  let result = BigInt(0);
  for (const byte of bytes) {
    result = (result << BigInt(8)) + BigInt(byte);
  }
  
  return result.toString();
}

export function keyToUint8Array(keyString: string): Uint8Array {
  let n = BigInt(keyString);
  const result = new Uint8Array(31);
  for (let i = 30; i >= 0; i--) {
    result[i] = Number(n & BigInt(0xff));
    n >>= BigInt(8);
  }
  return result;
}

export async function encryptWithAES(data: string, keyBytes: Uint8Array): Promise<Blob> {
  const encoder = new TextEncoder();
  
  const paddedKey = new Uint8Array(32);
  paddedKey.set(keyBytes);

  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    paddedKey,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    cryptoKey,
    encoder.encode(data)
  );

  return new Blob([iv, new Uint8Array(encryptedBuffer)], { type: "application/octet-stream" });
}

export async function decryptWithAES(encryptedBlob: Blob, keyString: string): Promise<string> {
  const arrayBuffer = await encryptedBlob.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);

  const iv = data.slice(0, 12);
  const ciphertext = data.slice(12);

  const keyBytes = keyToUint8Array(keyString); // Using your previous utility
  const paddedKey = new Uint8Array(32);
  paddedKey.set(keyBytes);

  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    paddedKey,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    cryptoKey,
    ciphertext
  );

  return new TextDecoder().decode(decryptedBuffer);
}