"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import { verifyShareTokenDb } from "../../lib/certificateStore";

export default function CompanyEngine() {
  const { user, loading: authLoading } = useAuth();
  const [tokenInput, setTokenInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [verificationHistory, setVerificationHistory] = useState([]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;

    setLoading(true);
    setErrorMsg("");
    setResult(null);

    let clean = tokenInput.trim();
    if (clean.includes("token=")) {
      clean = clean.split("token=")[1].split("&")[0];
    }

    try {
      const res = await verifyShareTokenDb(clean);
      if (res && res.cert) {
        setResult(res);
        setVerificationHistory((prev) => [
          {
            id: res.cert.id,
            name: res.disclosedFields?.studentName !== false ? res.cert.studentName : "Undisclosed Candidate",
            institution: res.cert.institution,
            docType: res.cert.docType,
            status: res.isRevoked ? "REVOKED" : "VERIFIED",
            time: new Date().toLocaleTimeString(),
          },
          ...prev.filter((p) => p.id !== res.cert.id),
        ]);
      } else {
        setErrorMsg(res?.error || "Unable to resolve credential proof. Link may be invalid or expired.");
      }
    } catch {
      setErrorMsg("Verification network request failed.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen py-10 px-4 max-w-5xl mx-auto space-y-8">
      {/* Top Banner */}
      <div className="p-6 bg-[#0c1322] border border-white/[0.06] rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] font-mono text-blue-400 uppercase tracking-widest font-bold block mb-1">
            Enterprise Recruiter Portal
          </span>
          <h1 className="text-2xl font-black text-white">Company Verification Engine</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Logged in as: <span className="text-blue-400 font-semibold">{user?.name || "Corporate Verifier"}</span> ({user?.company || "TechCorp Global"})
          </p>
        </div>
        <span className="px-3.5 py-1.5 bg-blue-950/80 border border-blue-700 text-blue-300 font-bold text-xs rounded-xl">
          Recruiter Tier Active
        </span>
      </div>

      {/* Search Bar */}
      <div className="bg-[#0c1322] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Candidate Credential Verification</h2>
        <p className="text-xs text-slate-400">
          Paste the candidate's Selective Share Link, Credential ID, or State Hash to inspect verified claims.
        </p>

        <form onSubmit={handleVerify} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Paste candidate share link (e.g., https://.../?token=share_xxx) or Credential ID..."
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            className="flex-1 bg-[#050811] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 font-mono"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50 shrink-0"
          >
            {loading ? "Inspecting..." : "Verify Candidate"}
          </button>
        </form>

        {errorMsg && (
          <div className="p-3.5 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-xs">
            ✕ {errorMsg}
          </div>
        )}
      </div>

      {/* Candidate Claims Result */}
      {result && result.cert && (
        <div
          className={`p-6 rounded-2xl border text-left space-y-4 backdrop-blur-xl shadow-2xl transition-all ${
            result.isRevoked
              ? "bg-red-950/20 border-red-800/80"
              : "bg-[#0c1322] border-blue-500/40"
          }`}
        >
          <div className="flex justify-between items-start border-b border-white/[0.06] pb-4">
            <div>
              <span className="text-[10px] font-bold font-mono text-blue-400 uppercase tracking-wider block">
                {result.cert.docType}
              </span>
              <h3 className="text-xl font-bold text-white mt-1">
                {result.disclosedFields?.degree !== false ? (result.cert.degree || result.cert.docType) : "[DEGREE CLAIM WITHHELD]"}
              </h3>
              <p className="text-xs text-blue-300 font-medium mt-0.5">{result.cert.institution}</p>
            </div>

            <span
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider ${
                result.isRevoked
                  ? "bg-red-950 border border-red-700 text-red-300"
                  : "bg-emerald-950 border border-emerald-700 text-emerald-300"
              }`}
            >
              {result.isRevoked ? "● REVOKED CLAIM" : "✓ VERIFIED CANDIDATE"}
            </span>
          </div>

          {result.isRevoked && (
            <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl text-xs text-red-200">
              <span className="font-bold">Institution Revocation Notice:</span> {result.cert.revocationReason || "Credential invalidated by the issuing authority."}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-[#050811] p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Candidate Name</span>
              <span className="font-semibold text-white mt-1 block">
                {result.disclosedFields?.studentName !== false ? result.cert.studentName : "[WITHHELD BY CANDIDATE]"}
              </span>
            </div>

            <div className="bg-[#050811] p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Student ID / Roll No</span>
              <span className="font-semibold text-white mt-1 block font-mono">
                {result.disclosedFields?.rollNumber !== false ? result.cert.studentId : "[WITHHELD]"}
              </span>
            </div>

            <div className="bg-[#050811] p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Verified CGPA</span>
              <span className="font-bold text-emerald-400 mt-1 block text-sm">
                {result.disclosedFields?.cgpa !== false ? `${result.cert.cgpa} / 10.0` : "[WITHHELD]"}
              </span>
            </div>

            <div className="bg-[#050811] p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Issuance Date</span>
              <span className="font-semibold text-slate-300 mt-1 block">
                {new Date((result.cert.timestamp || Date.now() / 1000) * 1000).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="bg-[#050811] p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="min-w-0 pr-4">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">SHA-256 State Fingerprint</span>
              <span className="font-mono text-[10px] text-blue-300 truncate block mt-0.5">
                {result.cert.hash}
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold shrink-0">
              Cloud Verified
            </span>
          </div>
        </div>
      )}

      {/* Recruiter Audit Log */}
      {verificationHistory.length > 0 && (
        <div className="bg-[#0c1322] border border-slate-800 rounded-2xl p-6 shadow-2xl">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
            Recent Candidate Verification Sessions
          </h3>
          <div className="divide-y divide-slate-800/60 text-xs">
            {verificationHistory.map((item, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">{item.name}</span>
                  <span className="text-slate-400 text-[11px]">{item.institution} — {item.docType}</span>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    item.status === "VERIFIED" ? "bg-emerald-950 text-emerald-300" : "bg-red-950 text-red-300"
                  }`}>
                    {item.status}
                  </span>
                  <span className="block text-[10px] text-slate-500 font-mono mt-0.5">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}