import { NextResponse } from "next/server";
import { put, list } from "@vercel/blob";

const TOKENS_FILENAME = "trustanchor_share_tokens_db.json";
const CERTS_FILENAME = "trustanchor_certificates_db.json";

async function getTokensData() {
  try {
    const { blobs } = await list();
    const existingBlob = blobs.find((b) => b.pathname === TOKENS_FILENAME);
    if (!existingBlob) return [];
    const res = await fetch(existingBlob.url, { cache: "no-store" });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function getCertificatesData() {
  try {
    const { blobs } = await list();
    const existingBlob = blobs.find((b) => b.pathname === CERTS_FILENAME);
    if (!existingBlob) return [];
    const res = await fetch(existingBlob.url, { cache: "no-store" });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const current = await getTokensData();
    const updated = [body, ...current.filter((t) => t.tokenId !== body.tokenId)];
    await put(TOKENS_FILENAME, JSON.stringify(updated), {
      access: "public",
      addRandomSuffix: false,
    });
    return NextResponse.json({ success: true, tokenId: body.tokenId });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    let rawQuery = searchParams.get("token") || searchParams.get("query") || "";
    
    // Extract token if a full URL was pasted
    if (rawQuery.includes("token=")) {
      rawQuery = rawQuery.split("token=")[1].split("&")[0];
    }
    
    const cleanQuery = decodeURIComponent(rawQuery.trim());

    if (!cleanQuery) {
      return NextResponse.json({ valid: false, error: "Empty query provided." }, { status: 400 });
    }

    const allCerts = await getCertificatesData();
    const allTokens = await getTokensData();

    // 1. Check if query is a Selective Share Token
    const tokenRecord = allTokens.find((t) => t.tokenId === cleanQuery);
    if (tokenRecord) {
      const now = Math.floor(Date.now() / 1000);
      if (tokenRecord.expiryTimestamp && now > Number(tokenRecord.expiryTimestamp)) {
        return NextResponse.json({ valid: false, error: "Share token has expired." }, { status: 410 });
      }

      const cert = allCerts.find((c) => c.id === tokenRecord.certId);
      if (!cert) {
        return NextResponse.json({ valid: false, error: "Associated record not found." }, { status: 404 });
      }

      return NextResponse.json({
        valid: cert.status !== "REVOKED",
        isRevoked: cert.status === "REVOKED",
        cert,
        disclosedFields: tokenRecord.selectedFields,
      });
    }

    // 2. Direct Lookup: By Credential ID, State Hash, or Roll Number
    const directCert = allCerts.find(
      (c) =>
        c.id?.toLowerCase() === cleanQuery.toLowerCase() ||
        c.hash?.toLowerCase() === cleanQuery.toLowerCase() ||
        c.studentId?.toLowerCase() === cleanQuery.toLowerCase()
    );

    if (directCert) {
      return NextResponse.json({
        valid: directCert.status !== "REVOKED",
        isRevoked: directCert.status === "REVOKED",
        cert: directCert,
        disclosedFields: {
          studentName: true,
          rollNumber: true,
          degree: true,
          cgpa: true,
        },
      });
    }

    return NextResponse.json(
      { valid: false, error: "No matching record found for this identifier or token." },
      { status: 404 }
    );
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}