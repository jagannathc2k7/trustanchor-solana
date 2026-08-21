const CERTS_KEY = "trustanchor_issued_certificates";
const TOKENS_KEY = "trustanchor_share_tokens";
const ISSUERS_KEY = "trustanchor_trusted_issuers";

const DEFAULT_ISSUERS = [
  { id: "did:web:vit.ac.in", name: "VIT Chennai", status: "VERIFIED", domain: "vit.ac.in" },
  { id: "did:web:iitm.ac.in", name: "IIT Madras", status: "VERIFIED", domain: "iitm.ac.in" },
  { id: "did:web:unknown.edu", name: "Apex University", status: "PENDING", domain: "unknown.edu" },
];

export function getTrustedIssuers() {
  if (typeof window === "undefined") return DEFAULT_ISSUERS;
  const raw = localStorage.getItem(ISSUERS_KEY);
  if (!raw) {
    localStorage.setItem(ISSUERS_KEY, JSON.stringify(DEFAULT_ISSUERS));
    return DEFAULT_ISSUERS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return DEFAULT_ISSUERS;
  }
}

export function updateIssuerStatus(domainOrId, newStatus) {
  const issuers = getTrustedIssuers();
  const updated = issuers.map((item) =>
    item.id === domainOrId || item.domain === domainOrId || item.name === domainOrId
      ? { ...item, status: newStatus }
      : item
  );
  localStorage.setItem(ISSUERS_KEY, JSON.stringify(updated));
  return updated;
}

export function getAllCertificates() {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(CERTS_KEY);
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
  localStorage.setItem(CERTS_KEY, JSON.stringify(updated));
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
  localStorage.setItem(CERTS_KEY, JSON.stringify(updated));
  return updated;
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

// Selective Sharing Token Storage
export function createSelectiveShareToken({ certId, selectedFields, durationHours }) {
  const tokens = getShareTokens();
  const tokenId = "share_" + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
  
  const expiryTimestamp =
    durationHours === "permanent"
      ? null
      : Math.floor(Date.now() / 1000) + Number(durationHours) * 3600;

  const newToken = {
    tokenId,
    certId,
    selectedFields, // e.g. { name: true, degree: true, cgpa: false, roll: false }
    expiryTimestamp,
    createdAt: Math.floor(Date.now() / 1000),
  };

  tokens.push(newToken);
  localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
  return tokenId;
}

export function getShareTokens() {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(TOKENS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function verifyShareToken(tokenId) {
  const tokens = getShareTokens();
  const record = tokens.find((t) => t.tokenId === tokenId);
  if (!record) return { valid: false, error: "Invalid share token link." };

  const now = Math.floor(Date.now() / 1000);
  if (record.expiryTimestamp && now > record.expiryTimestamp) {
    return { valid: false, error: "This selective disclosure share link has expired." };
  }

  const cert = findCertificateByIdOrHash(record.certId);
  if (!cert) return { valid: false, error: "Original certificate not found in ledger." };
  if (cert.status === "REVOKED") {
    return { valid: false, isRevoked: true, cert, error: "ACCESS REVOKED: This credential has been revoked on-chain." };
  }

  return {
    valid: true,
    cert,
    disclosedFields: record.selectedFields,
    expiryTimestamp: record.expiryTimestamp,
  };
}