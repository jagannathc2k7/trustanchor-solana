"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { verifyShareTokenDb } from "../lib/certificateStore";

export default function HomePage() {
  const [tokenInput, setTokenInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Auto-verify if ?token= URL parameter is present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get("token");
      if (urlToken) {
        setTokenInput(urlToken);
        executeVerification(urlToken);
      }
    }
  }, []);

  const executeVerification = async (queryStr) => {
    let clean = queryStr.trim();
    if (clean.includes("token=")) {
      clean = clean.split("token=")[1].split("&")[0];
    }

    setLoading(true);
    setErrorMsg("");
    setResult(null);

    try {
      const res = await verifyShareTokenDb(clean);
      if (res && res.cert) {
        setResult(res);
      } else {
        setErrorMsg(res?.error || "Invalid credential identifier, state hash, or expired link.");
      }
    } catch {
      setErrorMsg("Verification service unreachable. Check your network connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = (e) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    executeVerification(tokenInput);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl text-center space-y-6">
        {/* Verification Engine Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          SHA-256 Ledger & Selective Share Verifier
        </div>

        {/* Hero Headline */}
        <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
          Verify Academic Credentials <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-400 to-emerald-400">
            Instantly & Tamper-Proof
          </span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
          Verify any credential ID, cryptographic hash, roll number, or selective share link with instant database validation.
        </p>

        {/* Search Bar */}
        <form
          onSubmit={handleVerify}
          className="p-2 bg-[#0c1322]/90 border border-white/[0.08] rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row gap-2"
        >
          <input
            type="text"
            placeholder="Paste Credential ID, SHA-256 Hash, or Share URL..."
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            className="flex-1 bg-[#050811] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 font-mono"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50 shrink-0"
          >
            {loading ? "Verifying..." : "Verify Proof"}
          </button>
        </form>

        {errorMsg && (
          <div className="p-3.5 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-xs text-left">
            ✕ {errorMsg}
          </div>
        )}

        {/* Verification Result Card */}
        {result && result.cert && (
          <div
            className={`p-6 rounded-2xl border text-left space-y-4 backdrop-blur-xl shadow-2xl transition-all ${
              result.isRevoked
                ? "bg-red-950/20 border-red-800/80"
                : "bg-[#0c1322]/90 border-emerald-500/40"
            }`}
          >
            <div className="flex justify-between items-start border-b border-white/[0.06] pb-4">
              <div>
                <span className="text-[10px] font-bold font-mono text-purple-400 uppercase tracking-wider block">
                  {result.cert.docType}
                </span>
                <h3 className="text-lg font-bold text-white mt-1">
                  {result.disclosedFields?.degree !== false ? (result.cert.degree || result.cert.docType) : "[DEGREE NOT DISCLOSED]"}
                </h3>
                <p className="text-xs text-purple-300 font-medium mt-0.5">{result.cert.institution}</p>
              </div>

              <span
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider ${
                  result.isRevoked
                    ? "bg-red-950 border border-red-700 text-red-300"
                    : "bg-emerald-950 border border-emerald-700 text-emerald-300"
                }`}
              >
                {result.isRevoked ? "● REVOKED / INVALID" : "✓ VERIFIED AUTHENTIC"}
              </span>
            </div>

            {result.isRevoked && (
              <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl text-xs text-red-200">
                <span className="font-bold">Revocation Notice:</span> {result.cert.revocationReason || "Academic correction or invalidation registered by the institution."}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#050811] p-3.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Student Full Name</span>
                <span className="font-semibold text-white mt-1 block">
                  {result.disclosedFields?.studentName !== false ? result.cert.studentName : "[HIDDEN BY STUDENT]"}
                </span>
              </div>

              <div className="bg-[#050811] p-3.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Registration / Roll No</span>
                <span className="font-semibold text-white mt-1 block font-mono">
                  {result.disclosedFields?.rollNumber !== false ? result.cert.studentId : "[HIDDEN BY STUDENT]"}
                </span>
              </div>

              <div className="bg-[#050811] p-3.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Cumulative CGPA</span>
                <span className="font-bold text-emerald-400 mt-1 block text-sm">
                  {result.disclosedFields?.cgpa !== false ? `${result.cert.cgpa} / 10.0` : "[HIDDEN BY STUDENT]"}
                </span>
              </div>

              <div className="bg-[#050811] p-3.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Issuance Date</span>
                <span className="font-semibold text-slate-300 mt-1 block">
                  {new Date((result.cert.timestamp || Date.now() / 1000) * 1000).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="bg-[#050811] p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">SHA-256 State Fingerprint</span>
              <span className="font-mono text-[10px] text-purple-300 break-all block mt-1">
                {result.cert.hash}
              </span>
            </div>
          </div>
        )}

        {/* Portal Shortcuts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 text-left">
          <Link href="/student" className="p-4 bg-[#0c1322]/60 hover:bg-[#0c1322] border border-white/[0.06] hover:border-purple-500/40 rounded-xl transition group">
            <span className="text-xs font-bold text-slate-200 block group-hover:text-purple-400">Student Vault</span>
            <span className="text-[11px] text-slate-500 mt-1 block">View PDF & share</span>
          </Link>
          <Link href="/issuer" className="p-4 bg-[#0c1322]/60 hover:bg-[#0c1322] border border-white/[0.06] hover:border-purple-500/40 rounded-xl transition group">
            <span className="text-xs font-bold text-slate-200 block group-hover:text-purple-400">Issuer Portal</span>
            <span className="text-[11px] text-slate-500 mt-1 block">Issue & revoke</span>
          </Link>
          <Link href="/company" className="p-4 bg-[#0c1322]/60 hover:bg-[#0c1322] border border-white/[0.06] hover:border-purple-500/40 rounded-xl transition group">
            <span className="text-xs font-bold text-slate-200 block group-hover:text-purple-400">Company Engine</span>
            <span className="text-[11px] text-slate-500 mt-1 block">Recruiter portal</span>
          </Link>
          <Link href="/admin" className="p-4 bg-[#0c1322]/60 hover:bg-[#0c1322] border border-white/[0.06] hover:border-purple-500/40 rounded-xl transition group">
            <span className="text-xs font-bold text-slate-200 block group-hover:text-purple-400">Trust Registry</span>
            <span className="text-[11px] text-slate-500 mt-1 block">Manage issuers</span>
          </Link>
        </div>
      </div>
    </div>
  );
}