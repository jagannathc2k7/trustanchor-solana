import { NextResponse } from "next/server";
import { put, list } from "@vercel/blob";

const BLOB_FILENAME = "trustanchor_certificates_db.json";

async function getCertificatesData() {
  try {
    const { blobs } = await list();
    const existingBlob = blobs.find((b) => b.pathname === BLOB_FILENAME);
    if (!existingBlob) return [];

    const res = await fetch(existingBlob.url, { cache: "no-store" });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error("Error reading Vercel Blob:", err);
    return [];
  }
}

async function saveCertificatesData(data) {
  await put(BLOB_FILENAME, JSON.stringify(data), {
    access: "public",
    addRandomSuffix: false,
  });
}

export async function GET() {
  const data = await getCertificatesData();
  return NextResponse.json(data);
}

export async function POST(req) {
  try {
    const newRecord = await req.json();
    const current = await getCertificatesData();
    const updated = [newRecord, ...current.filter((c) => c.id !== newRecord.id)];
    await saveCertificatesData(updated);
    return NextResponse.json({ success: true, record: newRecord });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const { id, ...updates } = await req.json();
    const current = await getCertificatesData();
    const updated = current.map((c) => (c.id === id ? { ...c, ...updates } : c));
    await saveCertificatesData(updated);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const current = await getCertificatesData();
    const updated = current.filter((c) => c.id !== id);
    await saveCertificatesData(updated);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}