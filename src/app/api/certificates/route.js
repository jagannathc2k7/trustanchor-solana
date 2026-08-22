import { NextResponse } from "next/server";
import { put, list, del } from "@vercel/blob";

const CERTS_FILENAME = "trustanchor_certificates_db.json";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getLatestCertBlob() {
  try {
    const { blobs } = await list();
    const certBlobs = blobs
      .filter((b) => b.pathname === CERTS_FILENAME)
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    return certBlobs[0] || null;
  } catch {
    return null;
  }
}

async function getCertificatesData() {
  try {
    const latestBlob = await getLatestCertBlob();
    if (!latestBlob) return [];

    const res = await fetch(`${latestBlob.url}?t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache, no-store" },
    });

    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Blob read error:", err);
    return [];
  }
}

async function writeCertificatesData(data) {
  try {
    const newBlob = await put(CERTS_FILENAME, JSON.stringify(data), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    const { blobs } = await list();
    const oldBlobs = blobs.filter(
      (b) => b.pathname === CERTS_FILENAME && b.url !== newBlob.url
    );
    if (oldBlobs.length > 0) {
      await Promise.all(oldBlobs.map((b) => del(b.url)));
    }
    return newBlob;
  } catch (err) {
    console.error("Blob write error:", err);
    return null;
  }
}

export async function GET() {
  const data = await getCertificatesData();
  return new NextResponse(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

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

export async function PATCH(req) {
  try {
    const { id, ...fields } = await req.json();
    const current = await getCertificatesData();
    const targetIdx = current.findIndex((c) => c.id === id);

    if (targetIdx === -1) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    current[targetIdx] = { ...current[targetIdx], ...fields };
    await writeCertificatesData(current);
    return NextResponse.json({ success: true, record: current[targetIdx] });
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
    await writeCertificatesData(updated);
    return NextResponse.json({ success: true, deletedId: id });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}