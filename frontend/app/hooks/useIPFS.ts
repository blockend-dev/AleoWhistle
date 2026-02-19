"use client";

import { useState } from 'react';

export function useIPFS() {
  const [isUploading, setIsUploading] = useState(false);

  const uploadToIPFS = async (data: Blob | File | File[]): Promise<string> => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      
      // If it's an array of files (Evidence), we append them all
      if (Array.isArray(data)) {
        data.forEach((file) => formData.append("file", file));
      } else {
        // If it's the encrypted Blob, we give it a dummy filename
        formData.append("file", data, "encrypted_report.bin");
      }

      const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error("IPFS Upload Failed");

      const result = await response.json();
      return result.IpfsHash; 
    } catch (error) {
      console.error("IPFS Hook Error:", error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Fetches the encrypted blob back from IPFS for the Reviewer
   */
  const fetchFromIPFS = async (cid: string): Promise<Blob> => {
    const gateway = `https://gateway.pinata.cloud/ipfs/${cid}`;
    const response = await fetch(gateway);
    if (!response.ok) throw new Error("Could not fetch data from IPFS");
    
    return await response.blob();
  };

  return { uploadToIPFS, fetchFromIPFS, isUploading };
}