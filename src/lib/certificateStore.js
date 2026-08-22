export async function fetchAllCertificates() {
  try {
    const res = await fetch(`/api/certificates?t=${Date.now()}`, {
      cache: "no-store",
      headers: { Pragma: "no-cache" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data)) {
      localStorage.setItem("trustanchor_issued_certificates", JSON.stringify(data));
      return data;
    }
    return [];
  } catch {
    const raw = localStorage.getItem("trustanchor_issued_certificates");
    try {
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
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

    const res = await fetch("/api/certificates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...fields }),
    });
    return res.ok;
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