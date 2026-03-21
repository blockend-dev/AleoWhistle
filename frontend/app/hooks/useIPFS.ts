"use client";

import { useState } from 'react';

const IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs',
  'https://ipfs.io/ipfs',
  'https://cloudflare-ipfs.com/ipfs',
  'https://dweb.link/ipfs',
];

export function useIPFS() {
  const [isUploading, setIsUploading] = useState(false);

  const uploadToIPFS = async (data: Blob | File | File[]): Promise<string> => {
    setIsUploading(true);
    try {
      const formData = new FormData();

      if (Array.isArray(data)) {
        data.forEach((file) => formData.append("file", file));
      } else {
        formData.append("file", data, "encrypted_report.bin");
      }

      const response = await fetch("/api/ipfs", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "IPFS upload failed");
      }

      const result = await response.json();
      return result.IpfsHash;
    } catch (error) {
      console.error("IPFS upload error:", error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const fetchFromIPFS = async (cid: string): Promise<Blob> => {
    let lastError: Error | null = null;

    for (const gateway of IPFS_GATEWAYS) {
      try {
        const response = await fetch(`${gateway}/${cid}`, { signal: AbortSignal.timeout(10000) });
        if (response.ok) return await response.blob();
      } catch (err) {
        lastError = err as Error;
      }
    }

    throw lastError ?? new Error(`Could not fetch CID ${cid} from any IPFS gateway`);
  };

  return { uploadToIPFS, fetchFromIPFS, isUploading };
}
