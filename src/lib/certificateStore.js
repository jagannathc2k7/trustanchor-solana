export async function fetchAllCertificates() {
  try {
    const res = await fetch("/api/certificates", { cache: "no-store" });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function saveCertificateToDb(certRecord) {
  const res = await fetch("/api/certificates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(certRecord),
  });
  return res.ok;
}

export async function updateCertificateInDb(id, fields) {
  const res = await fetch("/api/certificates", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...fields }),
  });
  return res.ok;
}

export async function deleteCertificateFromDb(id) {
  const res = await fetch(`/api/certificates?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return res.ok;
}

export async function createSelectiveShareTokenDb({ certId, selectedFields, durationHours }) {
  const tokenId = "share_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  const expiryTimestamp =
    durationHours === "permanent"
      ? null
      : Math.floor(Date.now() / 1000) + Number(durationHours) * 3600;

  await fetch("/api/share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tokenId,
      certId,
      selectedFields,
      expiryTimestamp,
      createdAt: Math.floor(Date.now() / 1000),
    }),
  });

  return tokenId;
}

export async function verifyShareTokenDb(tokenId) {
  try {
    const res = await fetch(`/api/share?token=${encodeURIComponent(tokenId)}`);
    return await res.json();
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

// Fallback synchronous helpers for legacy component references
export function getAllCertificates() {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem("trustanchor_issued_certificates");
  try {
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCertificate(cert) {
  const list = getAllCertificates();
  const updated = [cert, ...list.filter((c) => c.id !== cert.id)];
  localStorage.setItem("trustanchor_issued_certificates", JSON.stringify(updated));
  return updated;
}

export function updateCertificateRecord(id, fields) {
  const list = getAllCertificates();
  const updated = list.map((c) => (c.id === id ? { ...c, ...fields } : c));
  localStorage.setItem("trustanchor_issued_certificates", JSON.stringify(updated));
  return updated;
}

export function deleteCertificateRecord(id) {
  const list = getAllCertificates();
  const updated = list.filter((c) => c.id !== id);
  localStorage.setItem("trustanchor_issued_certificates", JSON.stringify(updated));
  return updated;
}

export function updateCertificateStatus(id, status, reason = "") {
  return updateCertificateRecord(id, { status, revocationReason: reason });
}

export function createSelectiveShareToken(params) {
  return createSelectiveShareTokenDb(params);
}

export function verifyShareToken(token) {
  return verifyShareTokenDb(token);
}

export function getTrustedIssuers() {
  return [
    { id: "did:web:vit.ac.in", name: "VIT Chennai", status: "VERIFIED", domain: "vit.ac.in" },
    { id: "did:web:iitm.ac.in", name: "IIT Madras", status: "VERIFIED", domain: "iitm.ac.in" },
    { id: "did:web:unknown.edu", name: "Apex University", status: "PENDING", domain: "unknown.edu" },
  ];
}

export function updateIssuerStatus(domainOrId, newStatus) {
  return getTrustedIssuers().map((item) =>
    item.id === domainOrId || item.domain === domainOrId ? { ...item, status: newStatus } : item
  );
}