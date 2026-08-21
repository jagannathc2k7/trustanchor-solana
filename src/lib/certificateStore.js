const STORAGE_KEY = "trustanchor_issued_certificates";

export function getAllCertificates() {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveCertificate(certRecord) {
  const existing = getAllCertificates();
  const updated = [certRecord, ...existing.filter((c) => c.id !== certRecord.id)];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function updateCertificateRecord(id, updatedFields) {
  const all = getAllCertificates();
  const updated = all.map((c) => (c.id === id ? { ...c, ...updatedFields } : c));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function deleteCertificateRecord(id) {
  const all = getAllCertificates();
  const updated = all.filter((c) => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function updateCertificateStatus(id, newStatus, reason = "") {
  const all = getAllCertificates();
  const updated = all.map((c) => {
    if (c.id === id) {
      return {
        ...c,
        status: newStatus,
        revokedAt: newStatus === "REVOKED" ? Math.floor(Date.now() / 1000) : null,
        revocationReason: reason || c.revocationReason || "Revoked by Issuing Authority",
      };
    }
    return c;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function getCertificatesByStudent(studentKeyOrId) {
  const all = getAllCertificates();
  return all.filter(
    (c) =>
      c.studentKey?.toLowerCase() === studentKeyOrId?.toLowerCase() ||
      c.studentId?.toLowerCase() === studentKeyOrId?.toLowerCase() ||
      c.studentEmail?.toLowerCase() === studentKeyOrId?.toLowerCase()
  );
}

export function findCertificateByIdOrHash(query) {
  if (!query) return null;
  const all = getAllCertificates();
  const clean = query.trim().toLowerCase();
  return (
    all.find(
      (c) =>
        c.id?.toLowerCase() === clean ||
        c.hash?.toLowerCase() === clean ||
        c.studentId?.toLowerCase() === clean
    ) || null
  );
}