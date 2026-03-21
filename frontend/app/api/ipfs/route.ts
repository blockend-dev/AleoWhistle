import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const pinataResponse = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PINATA_JWT}`,
      },
      body: formData,
    });

    const result = await pinataResponse.json();

    if (!pinataResponse.ok) {
      console.error("Pinata error:", result);
      return NextResponse.json(result, { status: pinataResponse.status });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("IPFS route error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
