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

export function getCertificatesByStudent(studentKeyOrId) {
  const all = getAllCertificates();
  return all.filter(
    (c) =>
      c.studentKey?.toLowerCase() === studentKeyOrId?.toLowerCase() ||
      c.studentId?.toLowerCase() === studentKeyOrId?.toLowerCase()
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