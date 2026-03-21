import { CID } from 'multiformats/cid';

const PROVABLE_API_URL = 'https://api.provable.com/v2/testnet';


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

// Generates a random BigInt seed (private reporter identity)
export function generateSeed(): string {
  const bytes = window.crypto.getRandomValues(new Uint8Array(31));
  let result = BigInt(0);
  for (const byte of bytes) {
    result = (result << BigInt(8)) + BigInt(byte);
  }
  return result.toString();
}

/**
 * Encrypts a case key for TWO recipients (admin + reviewer) using a SINGLE
 * ephemeral key pair. This ensures the on-chain `ephemeral_key` field can be
 * used by EITHER party to reconstruct the ECDH shared secret and recover their
 * respective encrypted key.
 *
 * Scheme:
 *   sharedSecret_admin    = ephemeral.viewKey × admin.pubKey
 *   sharedSecret_reviewer = ephemeral.viewKey × reviewer.pubKey
 *   adminEncryptedKey     = (caseKey XOR sharedSecret_admin)  & mask250
 *   reviewerEncryptedKey  = (caseKey XOR sharedSecret_reviewer) & mask250
 *   ephemeralField        = x-coordinate of ephemeral public-key group point
 */
export async function encryptCaseKeyForBothRecipients(
  caseKeyField: string,
  adminAddress: string,
  reviewerAddress: string
) {
  if (typeof window === 'undefined') {
    throw new Error('This function can only be called on the client side');
  }

  const { Address, Account } = await import('@provablehq/sdk');

  // Single ephemeral account for both encryptions
  const ephemeral = new Account();
  const ephemeralScalar = ephemeral.privateKey().to_view_key().to_scalar();

  const adminGroup    = Address.from_string(adminAddress).toGroup();
  const reviewerGroup = Address.from_string(reviewerAddress).toGroup();

  // ECDH shared secrets: eph_vk * recipient_pubkey
  const adminSharedSecret    = adminGroup.scalarMultiply(ephemeralScalar);
  const reviewerSharedSecret = reviewerGroup.scalarMultiply(ephemeralScalar);

  const keyBI = BigInt(caseKeyField);

  // 250-bit mask: keeps XOR result safely within Aleo field bounds
  const mask = (BigInt(1) << BigInt(250)) - BigInt(1);

  const adminSecretBI    = extractGroupBI(adminSharedSecret.toString());
  const reviewerSecretBI = extractGroupBI(reviewerSharedSecret.toString());

  const adminEncryptedKey    = ((keyBI ^ adminSecretBI)    & mask).toString();
  const reviewerEncryptedKey = ((keyBI ^ reviewerSecretBI) & mask).toString();

  // Store the x-coordinate of the ephemeral public key as a field.
  // During decryption: Group.fromString(field + "group") reconstructs the point.
  const ephemeralGroupStr = ephemeral.address().toGroup().toString();
  const ephemeralField    = ephemeralGroupStr.replace(/group$/, '').trim();

  return {
    adminEncryptedKey,
    reviewerEncryptedKey,
    ephemeralField,
  };
}

/** Extracts the BigInt from an Aleo group string like "12345group" */
function extractGroupBI(groupStr: string): bigint {
  const numeric = groupStr.replace(/group$/, '').trim();
  return BigInt(numeric);
}

export async function addressToField(addressStr: string): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('addressToField can only be called on the client side');
  }

  const { Address } = await import('@provablehq/sdk');
  const fields = Address.from_string(addressStr).toFields();
  // toFields() returns an array; use the first element as the canonical field
  return Array.isArray(fields) ? fields[0].toString() : (fields as any).toString();
}

// Converts IPFS CID to a single Aleo Field (used as evidence_hash on-chain)
export function cidToAleoField(cidString: string): string {
  try {
    const cid = CID.parse(cidString);
    const digest = cid.multihash.digest;
    let result = BigInt(0);
    for (let i = 0; i < 31; i++) {
      result = (result << BigInt(8)) + BigInt(digest[i] ?? 0);
    }
    return `${result}field`;
  } catch {
    return '0field';
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
    'raw', paddedKey, { name: 'AES-GCM' }, false, ['encrypt']
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encoder.encode(data)
  );

  return new Blob([iv, new Uint8Array(encryptedBuffer)], { type: 'application/octet-stream' });
}

export async function decryptWithAES(encryptedBlob: Blob, keyString: string): Promise<string> {
  const arrayBuffer = await encryptedBlob.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);

  const iv         = data.slice(0, 12);
  const ciphertext = data.slice(12);

  const keyBytes  = keyToUint8Array(keyString);
  const paddedKey = new Uint8Array(32);
  paddedKey.set(keyBytes);

  const cryptoKey = await window.crypto.subtle.importKey(
    'raw', paddedKey, { name: 'AES-GCM' }, false, ['decrypt']
  );

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    ciphertext
  );

  return new TextDecoder().decode(decryptedBuffer);
}

/**
 * Recovers the original case key via ECDH XOR decryption.
 *
 *   recoveredKey = encryptedKey XOR (ephemeral.pubKey × reviewer.viewKey) & mask250
 *
 * The mask must match what was used during encryption so the XOR cancels correctly.
 */
export function recoverCaseKey(encryptedKeyStr: string, sharedSecretGroupStr: string): string {
  const mask         = (BigInt(1) << BigInt(250)) - BigInt(1);
  const encryptedBI  = BigInt(encryptedKeyStr);
  const secretBI     = extractGroupBI(sharedSecretGroupStr) & mask;
  return (encryptedBI ^ secretBI).toString();
}


export const getBlockchainReceipt = async (transactionId: string) => {
  const url = `${PROVABLE_API_URL}/transaction/${transactionId}`;

  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Blockchain query failed: ${response.statusText}`);
  }

  return response.json();
};

export const parseReportIdFromReceipt = (receipt: any): string => {
  try {
    const transitions = receipt?.execution?.transitions || [];

    const reportTx = transitions.find((t: any) => t.function === 'submit_report');
    if (!reportTx) {
      throw new Error('No submit_report transition found in receipt.');
    }

    const futureOutput = reportTx.outputs?.find((o: any) => o.type === 'future');
    if (futureOutput?.value) {
      // Matches the numeric part of something like "arguments: [ 8234...567field ]"
      const match = futureOutput.value.match(/arguments:\s*\[\s*(\d+)field/);
      if (match?.[1]) {
        return match[1];
      }
    }

    return '';
  } catch (err) {
    console.error('Report ID extraction error:', err);
    return '';
  }
};

export const parseAleoStruct = (structStr: string): Record<string, string> => {
  // Handle case where input is not a string (e.g. already parsed JSON object)
  const raw = typeof structStr === 'string' ? structStr : JSON.stringify(structStr);

  const cleanStr = raw.replace(/[{}]/g, '').replace(/\n/g, ' ');
  const pairs    = cleanStr.split(',').map(p => p.trim()).filter(Boolean);

  const result: Record<string, string> = {};

  for (const pair of pairs) {
    const colonIdx = pair.indexOf(':');
    if (colonIdx === -1) continue;

    const key = pair.slice(0, colonIdx).trim();
    const val = pair.slice(colonIdx + 1).trim();

    if (!key || !val) continue;

    // Strip Aleo type suffixes and normalise to plain BigInt strings
    if (val.endsWith('field')) {
      result[key] = val.replace(/field$/, '').trim();
    } else if (/u\d+$/.test(val)) {
      result[key] = String(parseInt(val.replace(/u\d+$/, ''), 10));
    } else if (val.endsWith('group')) {
      result[key] = val.replace(/group$/, '').trim();
    } else if (val.endsWith('address')) {
      result[key] = val.replace(/address$/, '').trim();
    } else {
      result[key] = val;
    }
  }

  return result;
};

export const REPORT_CATEGORIES: Record<number, string> = {
  1: 'Corruption',
  2: 'Harassment',
  3: 'Safety Violation',
  4: 'Fraud',
  5: 'Other',
};

export const REPORT_SEVERITY: Record<number, { label: string; color: string }> = {
  1: { label: 'Low',      color: 'text-blue-400'   },
  2: { label: 'Medium',   color: 'text-yellow-400' },
  3: { label: 'High',     color: 'text-orange-500' },
  4: { label: 'Critical', color: 'text-neon-red'   },
};

export const REPORT_STATUS: Record<number, { label: string; color: string }> = {
  1: { label: 'Pending Review',       color: 'text-neon-blue'  },
  2: { label: 'Under Investigation',  color: 'text-yellow-400' },
  3: { label: 'Resolved',             color: 'text-neon-green' },
  4: { label: 'Dismissed',            color: 'text-gray-500'   },
};

export const discoverReportIds = async (programName: string): Promise<string[]> => {
  try {
    const response = await fetch(
      `https://api.provable.com/v2/testnet/program/${programName}/transactions`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!response.ok) throw new Error('Could not fetch program transactions');

    const txIds: string[] = await response.json();

    const reportIds = await Promise.all(
      txIds.slice(0, 20).map(async (txId) => {
        const txDetails = await getBlockchainReceipt(txId);
        return parseReportIdFromReceipt(txDetails);
      })
    );

    return Array.from(new Set(reportIds.filter(id => id !== '')));
  } catch (error) {
    console.error('Discovery failed:', error);
    return [];
  }
};
