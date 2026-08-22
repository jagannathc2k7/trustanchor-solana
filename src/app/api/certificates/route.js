import { NextResponse } from "next/server";
import { put, list } from "@vercel/blob";

const CERTS_FILENAME = "trustanchor_certificates_db.json";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getCertificatesData() {
  try {
    const { blobs } = await list();
    const existingBlob = blobs.find((b) => b.pathname === CERTS_FILENAME);
    if (!existingBlob) return [];
    const res = await fetch(`${existingBlob.url}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const data = await getCertificatesData();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const current = await getCertificatesData();
    const updated = [body, ...current.filter((c) => c.id !== body.id)];

    await put(CERTS_FILENAME, JSON.stringify(updated), {
      access: "public",
      addRandomSuffix: false,
    });

    return NextResponse.json({ success: true, record: body });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const { id, ...fields } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Certificate ID is required." }, { status: 400 });
    }

    const current = await getCertificatesData();
    const updated = current.map((cert) =>
      cert.id === id ? { ...cert, ...fields } : cert
    );

    await put(CERTS_FILENAME, JSON.stringify(updated), {
      access: "public",
      addRandomSuffix: false,
    });

    return NextResponse.json({ success: true, id, updatedFields: fields });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Certificate ID is required." }, { status: 400 });
    }

    const current = await getCertificatesData();
    const updated = current.filter((c) => c.id !== id);

    await put(CERTS_FILENAME, JSON.stringify(updated), {
      access: "public",
      addRandomSuffix: false,
    });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}