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
  // Ensure we are in a browser environment
  if (typeof window === 'undefined') {
    throw new Error('encryptKeyForAddress can only be called on the client side');
  }

  // Dynamically import the SDK only when needed
  const { Address, Account } = await import('@provablehq/sdk');

  const ephemeral = new Account();
  const ephemeralScalar = ephemeral.privateKey().to_view_key().to_scalar();

  const recipient = Address.from_string(recipientAddress);
  const recipientGroup = recipient.toGroup();

  const sharedSecret = recipientGroup.scalarMultiply(ephemeralScalar);

  const keyBI = BigInt(caseKeyField);
  const secretBI = BigInt(sharedSecret.toString().replace(/group$/, ''));

  /** SAFETY CHECK:
   * Aleo Fields are roughly 252 bits.
   * If (keyBI ^ secretBI) is too large, the Leo contract will crash.
   * We mask it to 250 bits to be absolutely safe.
   */
  const mask = (BigInt(1) << BigInt(250)) - BigInt(1);
  const encryptedKey = ((keyBI ^ secretBI) & mask).toString();

  // Also convert the ephemeral address to its Field representation
  const ephemeralField = await addressToField(ephemeral.address().to_string());

  console.log("Ephemeral Field:", ephemeralField, "Encrypted Key:", encryptedKey);
  return {
    encryptedKey,
    ephemeralPublicKey: ephemeralField,
  };
}

export async function addressToField(addressStr: string): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('addressToField can only be called on the client side');
  }

  const { Address } = await import('@provablehq/sdk');
  return Address.from_string(addressStr).toFields().toString();
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

  const cryptoKey = await window.crypto.subtle.importKey('raw', paddedKey, { name: 'AES-GCM' }, false, [
    'encrypt',
  ]);

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

  const iv = data.slice(0, 12);
  const ciphertext = data.slice(12);

  const keyBytes = keyToUint8Array(keyString);
  const paddedKey = new Uint8Array(32);
  paddedKey.set(keyBytes);

  const cryptoKey = await window.crypto.subtle.importKey('raw', paddedKey, { name: 'AES-GCM' }, false, [
    'decrypt',
  ]);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    ciphertext
  );

  return new TextDecoder().decode(decryptedBuffer);
}


export const getBlockchainReceipt = async (transactionId: string) => {
  const url = `${PROVABLE_API_URL}/transaction/${transactionId}`;
  
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  });

  console.log("Fetching blockchain receipt from:", url, "Response status:", response.status);
  if (!response.ok) {
    throw new Error(`Blockchain query failed: ${response.statusText}`);
  }

  return response.json();
};

export const parseReportIdFromReceipt = (receipt: any): string => {
  try {
    const transitions = receipt?.execution?.transitions || [];
    
    // Specifically look for our report submission logic
    const reportTx = transitions.find((t: any) => t.function === "submit_report");
    console.log("Parsing receipt transitions:", transitions);
    if (!reportTx) {
      throw new Error("No report submission transition found in receipt.");
    }

    const futureOutput = reportTx.outputs?.find((o: any) => o.type === "future");
    console.log("Future output found:", futureOutput);
    if (futureOutput?.value) {
      // Matches the numeric part of something like "[ 8234...567field ]"
      const match = futureOutput.value.match(/arguments:\s*\[\s*(\d+)field/);
      
      if (match?.[1]) {
        console.log("Successfully identified Report ID:", match[1]);
        return match[1];
      }
    }
    
    return "";
  } catch (err) {
    console.error("Data extraction error:", err);
    return "";
  }
};

export const parseAleoStruct = (structStr: string) => {
  // We strip the curly braces and split by commas
  const cleanStr = structStr.replace(/[{}]/g, '');
  const pairs = cleanStr.split(',').map(p => p.trim());
  
  const result: any = {};
  
  pairs.forEach(pair => {
    const [key, val] = pair.split(':').map(s => s.trim());
    if (!key || !val) return;

    // Remove common Aleo suffixes and convert to JS types
    if (val.endsWith('field')) {
      result[key] = val.replace('field', '');
    } else if (val.endsWith('u8') || val.endsWith('u32') || val.endsWith('u64')) {
      result[key] = parseInt(val.replace(/u\d+/, ''), 10);
    } else if (val.endsWith('group')) {
      result[key] = val.replace('group', '');
    } else if (val.endsWith('address')) {
      result[key] = val.replace('address', '');
    } else {
      result[key] = val;
    }
  });

  return result;
};

export const REPORT_CATEGORIES: Record<number, string> = {
  1: "Corruption",
  2: "Harassment",
  3: "Safety Violation",
  4: "Fraud",
  5: "Other"
};

export const REPORT_SEVERITY: Record<number, { label: string; color: string }> = {
  1: { label: "Low", color: "text-blue-400" },
  2: { label: "Medium", color: "text-yellow-400" },
  3: { label: "High", color: "text-orange-500" },
  4: { label: "Critical", color: "text-neon-red" }
};

export const REPORT_STATUS: Record<number, { label: string; color: string }> = {
  1: { label: "Pending Review", color: "text-neon-blue" },
  2: { label: "Under Investigation", color: "text-yellow-400" },
  3: { label: "Resolved", color: "text-neon-green" },
  4: { label: "Dismissed", color: "text-gray-500" }
};

export const discoverReportIds = async (programName: string) => {
  try {
    // 1. Get the list of transaction IDs for your program
    // Note: Most Aleo explorers/APIs provide a 'transactions by program' endpoint
    const response = await fetch(
      `https://api.provable.com/v2/testnet/program/${programName}/transactions`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!response.ok) throw new Error("Could not fetch program transactions");
    
    const txIds: string[] = await response.json();

    // 2. For each transaction, fetch the details and extract the report_id
    const reportIds = await Promise.all(
      txIds.slice(0, 20).map(async (txId) => { // Limit to last 20 for performance
        const txDetails = await getBlockchainReceipt(txId);
        return parseReportIdFromReceipt(txDetails); 
      })
    );

    // Filter out empties and duplicates
    return Array.from(new Set(reportIds.filter(id => id !== "")));
  } catch (error) {
    console.error("Discovery failed:", error);
    return [];
  }
};