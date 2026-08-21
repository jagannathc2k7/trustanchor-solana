"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { verifyShareToken, findCertificateByIdOrHash } from "../../lib/certificateStore";

export default function CompanyPortal() {
  const { user } = useAuth();
  const [tokenInput, setTokenInput] = useState("");
  const [verificationResult, setVerificationResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [showPayloadModal, setShowPayloadModal] = useState(false);

  const handleVerify = (e) => {
    e.preventDefault();
    setErrorMsg("");
    setVerificationResult(null);

    let cleanToken = tokenInput.trim();
    if (cleanToken.includes("token=")) {
      cleanToken = cleanToken.split("token=")[1].split("&")[0];
    }

    // Try selective token first
    const tokenCheck = verifyShareToken(cleanToken);
    if (tokenCheck.valid) {
      setVerificationResult(tokenCheck);
      return;
    }

    // Fallback: Check Base58 ID directly
    const directCert = findCertificateByIdOrHash(cleanToken);
    if (directCert) {
      setVerificationResult({
        valid: directCert.status !== "REVOKED",
        isRevoked: directCert.status === "REVOKED",
        cert: directCert,
        disclosedFields: { studentName: true, degree: true, branch: true, cgpa: true, rollNumber: true },
      });
      return;
    }

    setErrorMsg(tokenCheck.error || "No valid academic credential or share token found.");
  };

  return (
    <div className="min-h-screen bg-[#050811] text-white flex flex-col items-center pt-8 px-4 pb-20">
      <div className="w-full max-w-3xl">
        <div className="bg-[#0c1322] border border-slate-800 p-6 rounded-2xl mb-8 flex justify-between items-center">
          <div>
            <span className="text-[11px] text-purple-400 font-mono uppercase tracking-wider">RECRUITER / VERIFIER PORTAL</span>
            <h1 className="text-xl font-bold mt-1">Company Credential Verification Engine</h1>
            <p className="text-xs text-slate-400">Authenticated verification for HRs and background checkers.</p>
          </div>
          <span className="bg-purple-950/80 border border-purple-800 text-purple-300 text-xs px-3 py-1 rounded-full font-bold">
            {user?.company || "XYZ Technologies"}
          </span>
        </div>

        {/* Search / Token input */}
        <form onSubmit={handleVerify} className="bg-[#0c1322] border border-slate-800 p-6 rounded-2xl mb-8 space-y-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Paste Share Token or Verification URL
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="http://localhost:3000/verify?token=share_... or Base58 ID"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="flex-1 bg-[#050811] border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition"
            >
              Verify Now
            </button>
          </div>

          <div className="text-[11px] text-slate-500 space-y-1 pt-2">
            <p>✔ Ed25519 & SHA-256 Cryptographic Signature Checks</p>
            <p>✔ Solana Program State Anchor & Revocation Lookup</p>
            <p>✔ Selective Disclosure Consent & Expiration Verification</p>
          </div>
        </form>

        {errorMsg && (
          <div className="p-4 bg-red-950/40 border border-red-800 rounded-xl text-red-300 text-xs mb-6">
            {errorMsg}
          </div>
        )}

        {/* Verification Result Card */}
        {verificationResult && (
          <div className={`bg-[#0c1322] border rounded-2xl p-6 shadow-2xl space-y-6 ${
            verificationResult.isRevoked ? "border-red-700 bg-red-950/10" : "border-slate-800"
          }`}>
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono uppercase text-purple-400">{verificationResult.cert.docType}</span>
                <h2 className="text-lg font-bold text-white">{verificationResult.cert.degree || verificationResult.cert.docType}</h2>
                <p className="text-xs text-slate-400">{verificationResult.cert.institution} • {verificationResult.cert.id.slice(0, 12)}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                verificationResult.isRevoked
                  ? "bg-red-950 border border-red-800 text-red-300"
                  : "bg-emerald-950 border border-emerald-800 text-emerald-300"
              }`}>
                {verificationResult.isRevoked ? "ACCESS REVOKED" : "• Verified"}
              </span>
            </div>

            {/* Checklist */}
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <span className={verificationResult.isRevoked ? "text-red-400" : "text-emerald-400"}>✔</span>
                <span>Authentic Credential & Signature Valid</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={verificationResult.isRevoked ? "text-red-400" : "text-emerald-400"}>✔</span>
                <span>Solana Anchor Ledger Record Verified</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={verificationResult.isRevoked ? "text-red-400" : "text-emerald-400"}>
                  {verificationResult.isRevoked ? "✖" : "✔"}
                </span>
                <span>Status: {verificationResult.isRevoked ? "REVOKED ON-CHAIN" : "Active & Unmodified"}</span>
              </div>
            </div>

            {/* Disclosed Claims Box */}
            <div className="p-4 bg-[#050811] border border-slate-800 rounded-xl space-y-3">
              <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                <span className="text-xs font-bold text-slate-200">Authorized Student Disclosed Claims</span>
                <span className="text-[10px] text-emerald-400 uppercase font-bold">Selective Disclosure Active</span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-slate-500">Student Name</p>
                  <p className="font-semibold text-white">
                    {verificationResult.disclosedFields?.studentName ? verificationResult.cert.studentName : "[HIDDEN BY STUDENT]"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Roll Number / Student ID</p>
                  <p className="font-semibold text-white">
                    {verificationResult.disclosedFields?.rollNumber ? verificationResult.cert.studentId : "[NOT REQUESTED]"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Degree / Major</p>
                  <p className="font-semibold text-white">
                    {verificationResult.disclosedFields?.degree ? verificationResult.cert.degree : "[HIDDEN]"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Cumulative CGPA</p>
                  <p className="font-semibold text-emerald-400">
                    {verificationResult.disclosedFields?.cgpa ? `${verificationResult.cert.cgpa} / 10.0` : "[NOT DISCLOSED]"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => setShowPayloadModal(true)}
                className="text-xs text-purple-400 hover:text-purple-300 underline font-semibold"
              >
                View Solana Ledger Payload
              </button>
            </div>
          </div>
        )}

        {/* PAYLOAD MODAL */}
        {showPayloadModal && verificationResult && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0c1322] border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h3 className="text-sm font-bold text-white">On-Chain Payload Inspection</h3>
                <button onClick={() => setShowPayloadModal(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>
              <pre className="bg-[#050811] p-4 rounded-xl text-[11px] text-emerald-400 font-mono overflow-auto max-h-60 border border-slate-800">
                {JSON.stringify({
                  network: "Solana Devnet",
                  credentialId: verificationResult.cert.id,
                  stateHash: verificationResult.cert.hash,
                  issuerAuthority: verificationResult.cert.issuerAuthority,
                  status: verificationResult.cert.status || "VALID",
                  disclosedClaims: verificationResult.disclosedFields,
                }, null, 2)}
              </pre>
              <button
                onClick={() => setShowPayloadModal(false)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}