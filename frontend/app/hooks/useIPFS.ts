"use client";

import { useState } from 'react';

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
        throw new Error(errorData.error || "IPFS Upload Failed");
      }

      const result = await response.json();
      return result.IpfsHash; 
    } catch (error) {
      console.error("IPFS Hook Error:", error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const fetchFromIPFS = async (cid: string): Promise<Blob> => { 
    // Public gateway fetching stays the same
    const gateway = `https://gateway.pinata.cloud/ipfs/${cid}`;
    const response = await fetch(gateway);
    if (!response.ok) throw new Error("Could not fetch data from IPFS");
    return await response.blob();
  };

  return { uploadToIPFS, fetchFromIPFS, isUploading };
}