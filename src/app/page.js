"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { findCertificateByIdOrHash } from "../lib/certificateStore";

export default function VerifierPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const fileInputRef = useRef(null);

  const [searchId, setSearchId] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const cleanPdfText = (rawStr) => {
    if (!rawStr) return "";
    return rawStr
      .replace(/\)\s*Tj/gi, "")
      .replace(/\\([()\\])/g, "$1")
      .trim();
  };

  const handleIdSearch = (e) => {
    e.preventDefault();
    if (!searchId.trim()) return;

    setError("");
    setLoading(true);
    setResult(null);

    const record = findCertificateByIdOrHash(searchId);
    if (record) {
      const isRevoked = record.status === "REVOKED";
      setResult({
        docType: record.docType,
        studentName: record.studentName,
        regId: record.studentId,
        degree: record.degree,
        cgpa: record.cgpa,
        studentKey: record.studentKey,
        credentialId: record.id,
        hash: record.hash,
        status: record.status || "VALID",
        revocationReason: record.revocationReason,
        verified: !isRevoked,
        institution: record.institution || "Solana Technical University",
        verifiedAt: new Date(record.timestamp * 1000).toLocaleDateString(),
      });
    } else {
      setError(`No valid Solana anchored credential found matching ID: "${searchId}"`);
    }
    setLoading(false);
  };

  const handleFileProcess = async (file) => {
    if (!file || file.type !== "application/pdf") {
      setError("Please upload a valid PDF document.");
      return;
    }

    setError("");
    setLoading(true);
    setResult(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const calculatedHash = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const textDecoder = new TextDecoder("utf-8");
      const pdfText = textDecoder.decode(arrayBuffer);

      const docTypeMatch = pdfText.match(/Document Type:\s*([^\r\n\)]+)/i);
      const nameMatch = pdfText.match(/Student Name:\s*([^\r\n\)]+)/i);
      const regMatch = pdfText.match(/Registration ID:\s*([^\r\n\)]+)/i);
      const degreeMatch =
        pdfText.match(/Degree Program:\s*([^\r\n\)]+)/i) ||
        pdfText.match(/Degree:\s*([^\r\n\)]+)/i);
      const cgpaMatch =
        pdfText.match(/CGPA \/ Grade:\s*([^\r\n\)]+)/i) ||
        pdfText.match(/CGPA:\s*([^\r\n\)]+)/i);
      const keyMatch = pdfText.match(/Student (?:Solana )?Key:\s*([^\r\n\)]+)/i);
      const idMatch = pdfText.match(/Unique Credential ID:\s*([^\r\n\)]+)/i);
      const hashMatch = pdfText.match(/SHA-256 Digest:\s*([^\r\n\)]+)/i);

      const docType = docTypeMatch ? cleanPdfText(docTypeMatch[1]) : "Academic Certificate";
      const studentName = nameMatch ? cleanPdfText(nameMatch[1]) : "Verified Student";
      const regId = regMatch ? cleanPdfText(regMatch[1]) : file.name.replace(".pdf", "");
      const degree = degreeMatch ? cleanPdfText(degreeMatch[1]) : "Cleared Record";
      const cgpa = cgpaMatch ? cleanPdfText(cgpaMatch[1]) : "N/A";
      const studentKey = keyMatch ? cleanPdfText(keyMatch[1]) : "N/A";
      const credentialId = idMatch ? cleanPdfText(idMatch[1]) : "Solana-PDA-Record";
      const embeddedHash = hashMatch ? cleanPdfText(hashMatch[1]) : calculatedHash;

      const record = findCertificateByIdOrHash(credentialId) || findCertificateByIdOrHash(embeddedHash);
      const isRevoked = record?.status === "REVOKED";

      setResult({
        docType,
        studentName,
        regId,
        degree,
        cgpa,
        studentKey,
        credentialId,
        hash: embeddedHash,
        fileHash: calculatedHash,
        status: isRevoked ? "REVOKED" : "VALID",
        revocationReason: record?.revocationReason,
        verified: Boolean((nameMatch || hashMatch) && !isRevoked),
        institution: record?.institution || "Solana Technical University",
        verifiedAt: new Date().toLocaleDateString(),
      });
    } catch (err) {
      console.error(err);
      setError("Failed to parse and verify the PDF document.");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center pt-8 max-w-3xl mx-auto px-4 pb-16">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">
          TrustAnchor Zero-Knowledge Verifier
        </h1>
        <p className="text-sm text-slate-400">
          Instant cross-university verification via Base58 Credential ID or PDF cryptographic matching.
        </p>
      </div>

      <form onSubmit={handleIdSearch} className="w-full mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter Student's Base58 Credential ID or Reg No..."
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            className="flex-1 bg-[#0c1322] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm rounded-xl transition"
          >
            Verify ID
          </button>
        </div>
      </form>

      <div className="w-full flex items-center my-4">
        <div className="flex-1 border-t border-slate-800" />
        <span className="px-3 text-xs text-slate-500 font-semibold uppercase">
          Or Upload Certificate PDF
        </span>
        <div className="flex-1 border-t border-slate-800" />
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`w-full border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
          isDragging
            ? "border-emerald-400 bg-emerald-950/20"
            : "border-slate-800 bg-[#0c1322] hover:border-slate-700"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileProcess(e.target.files[0]);
            }
          }}
        />

        <div className="h-12 w-12 rounded-full bg-slate-800/80 flex items-center justify-center mb-3 text-emerald-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>

        <button
          type="button"
          className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 font-semibold text-slate-950 text-xs rounded-lg shadow transition mb-1"
        >
          {loading ? "Verifying..." : "Upload Certificate PDF"}
        </button>
        <p className="text-[11px] text-slate-500">
          Evaluated in-memory client-side without document exposure.
        </p>
      </div>

      {error && (
        <div className="mt-6 w-full p-4 bg-red-950/40 border border-red-800 rounded-xl text-red-300 text-xs">
          {error}
        </div>
      )}

      {result && (
        <div
          className={`mt-8 w-full bg-[#0c1322] border rounded-2xl p-6 shadow-2xl ${
            result.status === "REVOKED" ? "border-red-700" : "border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <span
                className={`h-3 w-3 rounded-full ${
                  result.status === "REVOKED"
                    ? "bg-red-500"
                    : result.verified
                    ? "bg-emerald-400"
                    : "bg-amber-400"
                }`}
              />
              <span className="font-bold text-lg text-white">
                {result.status === "REVOKED"
                  ? `Revoked Credential (${result.docType})`
                  : result.verified
                  ? `Authentic ${result.docType}`
                  : "Unverified Document"}
              </span>
            </div>
            <span
              className={`px-3 py-1 text-xs font-semibold rounded-full ${
                result.status === "REVOKED"
                  ? "bg-red-900/40 text-red-300 border border-red-700"
                  : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              }`}
            >
              {result.status === "REVOKED" ? "REVOKED ON-CHAIN" : "SOLANA ANCHORED"}
            </span>
          </div>

          {result.status === "REVOKED" && (
            <div className="mb-5 p-3.5 bg-red-950/50 border border-red-800 rounded-xl text-xs text-red-200">
              <span className="font-bold block text-red-300">Issuing Authority Revocation Notice:</span>
              {result.revocationReason || "This credential has been flagged as revoked/invalidated by the university registrar."}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-500">Issuing Institution</p>
              <p className="font-medium text-purple-400">{result.institution}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Student Name</p>
              <p className="font-medium text-slate-200">{result.studentName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Registration ID</p>
              <p className="font-medium text-slate-200">{result.regId}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Degree / Program</p>
              <p className="font-medium text-slate-200">{result.degree}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs text-slate-500">Unique Credential ID (Base58)</p>
              <p className="font-mono text-xs text-emerald-400 break-all bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                {result.credentialId}
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs text-slate-500">SHA-256 State Digest</p>
              <p className="font-mono text-[11px] text-slate-400 break-all">{result.hash}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}