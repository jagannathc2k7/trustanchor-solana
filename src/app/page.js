"use client";

import React, { useState } from "react";
import Link from "next/link";
import { verifyShareTokenDb } from "../lib/certificateStore";

export default function HomePage() {
  const [tokenInput, setTokenInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;

    setLoading(true);
    setErrorMsg("");
    setResult(null);

    let cleanToken = tokenInput.trim();
    if (cleanToken.includes("token=")) {
      cleanToken = cleanToken.split("token=")[1].split("&")[0];
    }

    try {
      const res = await verifyShareTokenDb(cleanToken);
      if (res.valid || res.isRevoked) {
        setResult(res);
      } else {
        setErrorMsg(res.error || "Invalid credential identifier or expired token.");
      }
    } catch (err) {
      setErrorMsg("Verification request failed. Please check the ID or link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl text-center space-y-6">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Tamper-Proof Academic Verification Engine
        </div>

        {/* Hero Headline */}
        <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
          Verify Academic Credentials <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-400 to-emerald-400">
            Instantly & Securely
          </span>
        </h1>
        <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
          Cryptographically backed credential validation with zero-knowledge selective sharing for students, universities, and employers.
        </p>

        {/* Verification Form */}
        <form onSubmit={handleVerify} className="p-2 bg-[#0c1322]/80 border border-white/[0.08] rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Enter Credential ID or paste Selective Share Link..."
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
            {errorMsg}
          </div>
        )}

        {/* Verification Result Card */}
        {result && (
          <div className={`p-6 rounded-2xl border text-left space-y-4 backdrop-blur-xl shadow-2xl ${
            result.isRevoked ? "bg-red-950/20 border-red-800/80" : "bg-[#0c1322]/90 border-emerald-500/30"
          }`}>
            <div className="flex justify-between items-center border-b border-white/[0.06] pb-3">
              <div>
                <span className="text-[10px] font-bold font-mono text-purple-400 uppercase tracking-wider">
                  {result.cert.docType}
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">{result.cert.degree || result.cert.docType}</h3>
                <p className="text-xs text-slate-400">{result.cert.institution}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                result.isRevoked ? "bg-red-950 border border-red-700 text-red-300" : "bg-emerald-950 border border-emerald-700 text-emerald-300"
              }`}>
                {result.isRevoked ? "REVOKED" : "VERIFIED AUTHENTIC"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#050811] p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Student Name</span>
                <span className="font-semibold text-white">
                  {result.disclosedFields?.studentName !== false ? result.cert.studentName : "[HIDDEN]"}
                </span>
              </div>
              <div className="bg-[#050811] p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Registration ID</span>
                <span className="font-semibold text-white">
                  {result.disclosedFields?.rollNumber !== false ? result.cert.studentId : "[HIDDEN]"}
                </span>
              </div>
              <div className="bg-[#050811] p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] block">CGPA / Score</span>
                <span className="font-semibold text-emerald-400">
                  {result.disclosedFields?.cgpa !== false ? `${result.cert.cgpa} / 10.0` : "[HIDDEN]"}
                </span>
              </div>
              <div className="bg-[#050811] p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] block">State Hash</span>
                <span className="font-mono text-[10px] text-slate-400 truncate block">
                  {result.cert.hash}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Quick Portal Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 text-left">
          <Link href="/student" className="p-4 bg-[#0c1322]/60 hover:bg-[#0c1322] border border-white/[0.06] hover:border-purple-500/40 rounded-xl transition group">
            <span className="text-xs font-bold text-slate-200 block group-hover:text-purple-400">Student Vault</span>
            <span className="text-[11px] text-slate-500 mt-1 block">View grades, PDF & share</span>
          </Link>
          <Link href="/issuer" className="p-4 bg-[#0c1322]/60 hover:bg-[#0c1322] border border-white/[0.06] hover:border-purple-500/40 rounded-xl transition group">
            <span className="text-xs font-bold text-slate-200 block group-hover:text-purple-400">Issuer Portal</span>
            <span className="text-[11px] text-slate-500 mt-1 block">Sign, issue & revoke</span>
          </Link>
          <Link href="/company" className="p-4 bg-[#0c1322]/60 hover:bg-[#0c1322] border border-white/[0.06] hover:border-purple-500/40 rounded-xl transition group">
            <span className="text-xs font-bold text-slate-200 block group-hover:text-purple-400">Company Engine</span>
            <span className="text-[11px] text-slate-500 mt-1 block">Recruiter portal</span>
          </Link>
          <Link href="/admin" className="p-4 bg-[#0c1322]/60 hover:bg-[#0c1322] border border-white/[0.06] hover:border-purple-500/40 rounded-xl transition group">
            <span className="text-xs font-bold text-slate-200 block group-hover:text-purple-400">Trust Registry</span>
            <span className="text-[11px] text-slate-500 mt-1 block">Manage institutions</span>
          </Link>
        </div>
      </div>
    </div>
  );
}