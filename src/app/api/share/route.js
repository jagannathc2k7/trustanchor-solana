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

export async function POST(req) {
  try {
    const body = await req.json();
    const current = await getTokensData();
    const updated = [body, ...current];
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
    const token = searchParams.get("token");
    const tokens = await getTokensData();

    const tokenRecord = tokens.find((t) => t.tokenId === token);
    if (!tokenRecord) {
      return NextResponse.json({ valid: false, error: "Invalid share token." }, { status: 404 });
    }

    const now = Math.floor(Date.now() / 1000);
    if (tokenRecord.expiryTimestamp && now > Number(tokenRecord.expiryTimestamp)) {
      return NextResponse.json({ valid: false, error: "Share token has expired." }, { status: 410 });
    }

    // Fetch corresponding certificate from Blob
    const { blobs } = await list();
    const certBlob = blobs.find((b) => b.pathname === CERTS_FILENAME);
    let certs = [];
    if (certBlob) {
      const res = await fetch(certBlob.url, { cache: "no-store" });
      certs = await res.json();
    }

    const cert = certs.find((c) => c.id === tokenRecord.certId);
    if (!cert) {
      return NextResponse.json({ valid: false, error: "Original record not found." }, { status: 404 });
    }

    return NextResponse.json({
      valid: cert.status !== "REVOKED",
      isRevoked: cert.status === "REVOKED",
      cert,
      disclosedFields: tokenRecord.selectedFields,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}