const SEED_DATA = [
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

export async function fetchAllCertificates() {
  try {
    const res = await fetch(`/api/certificates?t=${Date.now()}`, {
      cache: "no-store",
      headers: { Pragma: "no-cache" },
    });
    
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        localStorage.setItem("trustanchor_issued_certificates", JSON.stringify(data));
        return data;
      }
    }
  } catch (e) {
    console.warn("API fetch error, falling back:", e);
  }

  // Fallback to local storage or initial seeds
  const local = localStorage.getItem("trustanchor_issued_certificates");
  try {
    const parsed = local ? JSON.parse(local) : null;
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {}

  localStorage.setItem("trustanchor_issued_certificates", JSON.stringify(SEED_DATA));
  return SEED_DATA;
}

export async function saveCertificateToDb(certRecord) {
  try {
    const current = await fetchAllCertificates();
    const updated = [certRecord, ...current.filter((c) => c.id !== certRecord.id)];
    localStorage.setItem("trustanchor_issued_certificates", JSON.stringify(updated));

    await fetch("/api/certificates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(certRecord),
    });
    return true;
  } catch {
    return true;
  }
}

export async function updateCertificateInDb(id, fields) {
  try {
    const current = await fetchAllCertificates();
    const updated = current.map((c) => (c.id === id ? { ...c, ...fields } : c));
    localStorage.setItem("trustanchor_issued_certificates", JSON.stringify(updated));

    await fetch("/api/certificates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...fields }),
    });
    return true;
  } catch {
    return true;
  }
}

export async function deleteCertificateFromDb(id) {
  try {
    const current = await fetchAllCertificates();
    const updated = current.filter((c) => c.id !== id);
    localStorage.setItem("trustanchor_issued_certificates", JSON.stringify(updated));

    await fetch(`/api/certificates?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return true;
  } catch {
    return true;
  }
}

export async function createSelectiveShareTokenDb({ certId, selectedFields, durationHours }) {
  const tokenId = "share_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  const expiryTimestamp =
    durationHours === "permanent"
      ? null
      : Math.floor(Date.now() / 1000) + Number(durationHours) * 3600;

  try {
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
  } catch (e) {
    console.warn("Share API fallback:", e);
  }

  return tokenId;
}

export async function verifyShareTokenDb(tokenId) {
  try {
    const res = await fetch(`/api/share?token=${encodeURIComponent(tokenId)}&t=${Date.now()}`, {
      cache: "no-store",
    });
    return await res.json();
  } catch (err) {
    return { valid: false, error: err.message };
  }
}