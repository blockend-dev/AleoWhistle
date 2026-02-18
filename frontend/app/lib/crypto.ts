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