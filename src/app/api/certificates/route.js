import { NextResponse } from "next/server";
import { put, list, del } from "@vercel/blob";

const CERTS_FILENAME = "trustanchor_certificates_db.json";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const INITIAL_SEED_CERTIFICATES = [
  {
    id: "cred_vit_cs_8841",
    hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    status: "VALID",
    docType: "OFFICIAL ACADEMIC TRANSCRIPT",
    institution: "VIT Chennai",
    studentName: "Alex Morgan",
    studentId: "CS-2026-8841",
    studentEmail: "alex.morgan@student.edu",
    degree: "Bachelor of Technology in Computer Science",
    cgpa: "3.92",
    issuerAuthority: "issuer@vit.ac.in",
    timestamp: 1774000000,
  },
  {
    id: "cred_vit_ece_1091",
    hash: "3b545265d6afc3a6f79c0263d31bdd71377497d2ded4548daac4b5c288142be6",
    status: "VALID",
    docType: "DEGREE CERTIFICATE",
    institution: "VIT Chennai",
    studentName: "Kishore S",
    studentId: "25BEL1091",
    studentEmail: "kishore.s2026@student.edu",
    degree: "Bachelor of Technology in Electrical and Computer Science",
    cgpa: "8.98",
    issuerAuthority: "issuer@vit.ac.in",
    timestamp: 1774050000,
  },
];

async function getCertificatesData() {
  try {
    const { blobs } = await list();
    const certBlob = blobs
      .filter((b) => b.pathname === CERTS_FILENAME)
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];

    if (!certBlob) {
      // Seed default certificates on first setup
      try {
        await put(CERTS_FILENAME, JSON.stringify(INITIAL_SEED_CERTIFICATES), {
          access: "public",
          addRandomSuffix: false,
          allowOverwrite: true,
        });
      } catch (e) {
        console.warn("Could not auto-seed blob:", e.message);
      }
      return INITIAL_SEED_CERTIFICATES;
    }

    const res = await fetch(`${certBlob.url}?t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });

    if (!res.ok) return INITIAL_SEED_CERTIFICATES;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data : INITIAL_SEED_CERTIFICATES;
  } catch (err) {
    console.warn("Blob read error, using fallback seed:", err.message);
    return INITIAL_SEED_CERTIFICATES;
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