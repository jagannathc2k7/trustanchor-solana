import { NextResponse } from "next/server";
import { put, list, del } from "@vercel/blob";

const CERTS_FILENAME = "trustanchor_certificates_db.json";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getLatestCertBlob() {
  const { blobs } = await list();
  // Sort descending by uploadedAt to always grab the freshest write
  const certBlobs = blobs
    .filter((b) => b.pathname === CERTS_FILENAME)
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  return certBlobs[0] || null;
}

async function getCertificatesData() {
  try {
    const latestBlob = await getLatestCertBlob();
    if (!latestBlob) return [];
    
    // Append timestamp query parameter to bypass Vercel CDN edge cache
    const res = await fetch(`${latestBlob.url}?t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache, no-store" },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function writeCertificatesData(data) {
  // 1. Write the new version
  const newBlob = await put(CERTS_FILENAME, JSON.stringify(data), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true, // Crucial: forces overwrite of the existing file
  });

  // 2. Clean up any redundant older blobs
  try {
    const { blobs } = await list();
    const oldBlobs = blobs.filter(
      (b) => b.pathname === CERTS_FILENAME && b.url !== newBlob.url
    );
    if (oldBlobs.length > 0) {
      await Promise.all(oldBlobs.map((b) => del(b.url)));
    }
  } catch (e) {
    console.warn("Blob cleanup warning:", e);
  }

  return newBlob;
}

// GET: Live fresh fetch
export async function GET() {
  try {
    const data = await getCertificatesData();
    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Issue new certificate
export async function POST(req) {
  try {
    const body = await req.json();
    const current = await getCertificatesData();
    const updated = [body, ...current.filter((c) => c.id !== body.id)];

    await writeCertificatesData(updated);
    return NextResponse.json({ success: true, record: body });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: Revoke or edit
export async function PATCH(req) {
  try {
    const { id, ...fields } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Certificate ID is required." }, { status: 400 });
    }

    const current = await getCertificatesData();
    const targetIndex = current.findIndex((c) => c.id === id);

    if (targetIndex === -1) {
      return NextResponse.json({ error: "Record not found." }, { status: 404 });
    }

    // Merge changes
    current[targetIndex] = { ...current[targetIndex], ...fields };

    await writeCertificatesData(current);
    return NextResponse.json({ success: true, id, updatedRecord: current[targetIndex] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Certificate ID is required." }, { status: 400 });
    }

    const current = await getCertificatesData();
    const updated = current.filter((c) => c.id !== id);

    await writeCertificatesData(updated);
    return NextResponse.json({ success: true, deletedId: id });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}