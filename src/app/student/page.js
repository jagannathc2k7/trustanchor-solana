"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import { getAllCertificates, createSelectiveShareToken } from "../../lib/certificateStore";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";

export default function StudentVault() {
  const [mounted, setMounted] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const [studentCerts, setStudentCerts] = useState([]);
  
  // Selective Share Modal State
  const [activeCertForShare, setActiveCertForShare] = useState(null);
  const [selectedFields, setSelectedFields] = useState({
    studentName: true,
    degree: true,
    branch: true,
    cgpa: true,
    rollNumber: false,
    subjectGrades: false,
  });
  const [shareDuration, setShareDuration] = useState("24");
  const [generatedShareLink, setGeneratedShareLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeQrModal, setActiveQrModal] = useState(null);
  const [qrModalDataUrl, setQrModalDataUrl] = useState("");

  const refreshCertificates = () => {
    const all = getAllCertificates();
    if (user) {
      const matched = all.filter(
        (c) =>
          (c.studentEmail && c.studentEmail.toLowerCase() === user.username?.toLowerCase()) ||
          (c.studentId && user.studentId && c.studentId.toLowerCase() === user.studentId.toLowerCase()) ||
          (user.name && c.studentName && c.studentName.toLowerCase() === user.name.toLowerCase())
      );
      // If no exact match (e.g. freshly seeded account), display available certificates
      setStudentCerts(matched.length > 0 ? matched : all);
    } else {
      setStudentCerts(all);
    }
  };

  useEffect(() => {
    setMounted(true);
    refreshCertificates();

    window.addEventListener("storage", refreshCertificates);
    return () => window.removeEventListener("storage", refreshCertificates);
  }, [user]);

  const openQrModal = async (cert) => {
    setActiveQrModal(cert);
    const qrData = JSON.stringify({
      credentialId: cert.id,
      docType: cert.docType,
      institution: cert.institution,
      hash: cert.hash,
      status: cert.status || "VALID",
      studentId: cert.studentId,
      studentKey: cert.studentKey,
      timestamp: cert.timestamp,
    });
    const url = await QRCode.toDataURL(qrData, { width: 280, margin: 1 });
    setQrModalDataUrl(url);
  };

  const handleGenerateShare = () => {
    if (!activeCertForShare) return;
    const tokenId = createSelectiveShareToken({
      certId: activeCertForShare.id,
      selectedFields,
      durationHours: shareDuration,
    });
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const fullUrl = `${origin}/company?token=${tokenId}`;
    setGeneratedShareLink(fullUrl);
  };

  const downloadOfficialPDF = async (record) => {
    try {
      const isRevoked = record.status === "REVOKED";
      const qrData = JSON.stringify({
        credentialId: record.id,
        docType: record.docType,
        institution: record.institution,
        status: record.status || "VALID",
        hash: record.hash,
        studentId: record.studentId,
        studentKey: record.studentKey,
        timestamp: record.timestamp,
      });
      const qrDataUrl = await QRCode.toDataURL(qrData, { margin: 1 });
      const formattedDate = new Date(record.timestamp * 1000).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const instName = (record.institution || "SOLANA TECHNICAL UNIVERSITY").toUpperCase();

      // 1. DEGREE CERTIFICATE
      if (record.docType === "DEGREE CERTIFICATE") {
        const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
        const pageWidth = 297;
        const pageHeight = 210;

        doc.setFillColor(254, 252, 246);
        doc.rect(0, 0, pageWidth, pageHeight, "F");

        doc.setDrawColor(isRevoked ? 220 : 180, isRevoked ? 38 : 140, isRevoked ? 38 : 60);
        doc.setLineWidth(2.5);
        doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

        doc.setDrawColor(15, 23, 42);
        doc.setLineWidth(0.8);
        doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

        if (isRevoked) {
          doc.setFont("times", "bold");
          doc.setFontSize(55);
          doc.setTextColor(239, 68, 68);
          doc.text("REVOKED / INVALID", pageWidth / 2, pageHeight / 2, { align: "center", angle: 35 });
        }

        doc.setFont("times", "bold");
        doc.setFontSize(24);
        doc.setTextColor(15, 23, 42);
        doc.text(instName, pageWidth / 2, 32, { align: "center" });

        doc.setFont("times", "italic");
        doc.setFontSize(11);
        doc.setTextColor(100, 116, 139);
        doc.text("Upon recommendation of the Academic Senate & Authority of Board of Governors", pageWidth / 2, 42, { align: "center" });

        doc.setFont("times", "normal");
        doc.setFontSize(13);
        doc.setTextColor(71, 85, 105);
        doc.text("hereby confers upon", pageWidth / 2, 54, { align: "center" });

        doc.setFont("times", "bolditalic");
        doc.setFontSize(28);
        doc.setTextColor(isRevoked ? 180 : 16, isRevoked ? 28 : 100, isRevoked ? 28 : 70);
        doc.text(record.studentName, pageWidth / 2, 70, { align: "center" });

        doc.setFont("times", "normal");
        doc.setFontSize(12);
        doc.setTextColor(71, 85, 105);
        doc.text(`(Roll / Registration Number: ${record.studentId})`, pageWidth / 2, 78, { align: "center" });

        doc.text("the degree of", pageWidth / 2, 90, { align: "center" });

        doc.setFont("times", "bold");
        doc.setFontSize(22);
        doc.setTextColor(15, 23, 42);
        doc.text(record.degree || "Bachelor of Technology in Computer Science", pageWidth / 2, 104, { align: "center" });

        doc.setFont("times", "normal");
        doc.setFontSize(11);
        doc.setTextColor(51, 65, 85);
        doc.text(`with Cumulative Grade Point Average (CGPA) of ${record.cgpa || "N/A"} / 10.0`, pageWidth / 2, 114, { align: "center" });

        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(22, 138, 175, 24, 2, 2, "FD");

        doc.setFont("courier", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Solana Credential ID : ${record.id}`, 26, 145);
        doc.text(`Anchor SHA-256 Digest : ${record.hash}`, 26, 151);
        doc.text(`Ledger Status        : ${record.status || "VALID"}`, 26, 157);

        doc.addImage(qrDataUrl, "PNG", pageWidth - 65, 134, 42, 42);
        doc.save(`degree_${record.studentId}${isRevoked ? "_REVOKED" : ""}.pdf`);
        return;
      }

      // 2. OFFICIAL ACADEMIC TRANSCRIPT & MIGRATION CERTIFICATE
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = 210;

      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 35, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(instName, pageWidth / 2, 22, { align: "center" });

      if (isRevoked) {
        doc.setFontSize(42);
        doc.setTextColor(239, 68, 68);
        doc.text("REVOKED", pageWidth / 2, 140, { align: "center", angle: 45 });
      }

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Document Type: ${record.docType}`, 20, 50);
      doc.text(`Student Name: ${record.studentName}`, 20, 62);
      doc.text(`Registration ID: ${record.studentId}`, 20, 74);
      doc.text(`Degree / Program: ${record.degree || "Cleared Record"}`, 20, 86);
      doc.text(`CGPA / Evaluation: ${record.cgpa || "Passed"}`, 20, 98);
      doc.text(`Issuance Date: ${formattedDate}`, 20, 110);
      doc.text(`Unique Credential ID: ${record.id}`, 20, 122);

      doc.addImage(qrDataUrl, "PNG", 130, 150, 55, 55);
      doc.save(`transcript_${record.studentId}${isRevoked ? "_REVOKED" : ""}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Failed to compile PDF: " + err.message);
    }
  };

  if (!mounted || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== "student") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="p-8 bg-[#0c1322] border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-2">Student Sign In Required</h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            Please sign in with your student credentials to view and manage your authenticated credentials.
          </p>
          <Link
            href="/login"
            className="inline-block w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition"
          >
            Go to Student Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050811] text-white flex flex-col items-center pt-6 px-4 pb-20">
      <div className="w-full max-w-5xl">
        {/* Student Profile Header */}
        <div className="bg-gradient-to-r from-slate-900 via-[#0c1322] to-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xl">
              {user.name ? user.name.charAt(0) : "S"}
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                {user.name || "Student"}
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-medium uppercase tracking-wider">
                  KYC Verified
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Roll ID: <span className="text-slate-200 font-mono font-semibold">{user.studentId || "25BLC1371"}</span> • Email: <span className="text-slate-200">{user.username}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-[#050811] border border-slate-800 px-4 py-2 rounded-xl text-right">
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Vault Assets</p>
              <p className="text-lg font-black text-emerald-400">{studentCerts.length} Records</p>
            </div>
          </div>
        </div>

        {/* Complete Academic Breakdown Cards */}
        <div className="space-y-6">
          {studentCerts.map((cert) => {
            const isRevoked = cert.status === "REVOKED";

            return (
              <div
                key={cert.id}
                className={`bg-[#0c1322] border rounded-2xl p-6 shadow-2xl transition-all ${
                  isRevoked
                    ? "border-red-800/80 bg-gradient-to-b from-[#160b0e] to-[#0c1322]"
                    : "border-slate-800 hover:border-slate-700"
                }`}
              >
                {/* Card Header */}
                <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-4 mb-5 gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-3 w-3 rounded-full ring-4 ${
                        isRevoked ? "bg-red-500 ring-red-500/20" : "bg-emerald-400 ring-emerald-400/20"
                      }`}
                    />
                    <div>
                      <span className="text-xs font-extrabold uppercase tracking-wider text-purple-400">
                        {cert.docType}
                      </span>
                      <h2 className="text-lg font-bold text-white">{cert.degree || cert.docType}</h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isRevoked ? (
                      <span className="bg-red-950/80 border border-red-700 text-red-300 text-[11px] font-bold px-3 py-1 rounded-full">
                        REVOKED ON-CHAIN
                      </span>
                    ) : (
                      <span className="bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-[11px] font-bold px-3 py-1 rounded-full">
                        ACTIVE / VALID
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      Issued: {new Date(cert.timestamp * 1000).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {isRevoked && (
                  <div className="mb-5 p-4 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-200">
                    <span className="font-bold text-red-300 block mb-1">Revocation Notice:</span>
                    {cert.revocationReason || "Revoked by issuing authority for update or re-issuance."}
                  </div>
                )}

                {/* Complete Record Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs mb-5">
                  <div className="bg-[#050811] p-3.5 rounded-xl border border-slate-800/80">
                    <p className="text-slate-500 font-semibold mb-0.5">Issuing University</p>
                    <p className="font-bold text-slate-200 text-sm truncate">{cert.institution || "VIT Chennai"}</p>
                  </div>
                  <div className="bg-[#050811] p-3.5 rounded-xl border border-slate-800/80">
                    <p className="text-slate-500 font-semibold mb-0.5">Cumulative CGPA</p>
                    <p className={`font-bold text-sm ${isRevoked ? "text-red-400" : "text-emerald-400"}`}>
                      {cert.cgpa ? `${cert.cgpa} / 10.0` : "Cleared"}
                    </p>
                  </div>
                  <div className="bg-[#050811] p-3.5 rounded-xl border border-slate-800/80">
                    <p className="text-slate-500 font-semibold mb-0.5">Registration Number</p>
                    <p className="font-bold text-slate-200 text-sm font-mono">{cert.studentId}</p>
                  </div>
                  <div className="bg-[#050811] p-3.5 rounded-xl border border-slate-800/80">
                    <p className="text-slate-500 font-semibold mb-0.5">Solana Program Hash</p>
                    <p className="font-mono text-slate-400 text-[10px] truncate">{cert.hash}</p>
                  </div>
                </div>

                {/* Individual Subject Credits Matrix */}
                <div className="bg-[#050811] border border-slate-800/80 rounded-xl p-4 mb-5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-3">
                    Course Performance & Academic Credits
                  </span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
                      <p className="text-[10px] text-slate-400 font-mono">CSE3001</p>
                      <p className="font-semibold text-white truncate">Software Engineering</p>
                      <p className="text-emerald-400 font-bold text-xs mt-1">Grade: A+ (4 Credits)</p>
                    </div>
                    <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
                      <p className="text-[10px] text-slate-400 font-mono">CSE3002</p>
                      <p className="font-semibold text-white truncate">Database Systems</p>
                      <p className="text-emerald-400 font-bold text-xs mt-1">Grade: A (4 Credits)</p>
                    </div>
                    <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
                      <p className="text-[10px] text-slate-400 font-mono">MAT2001</p>
                      <p className="font-semibold text-white truncate">Linear Algebra</p>
                      <p className="text-emerald-400 font-bold text-xs mt-1">Grade: S (3 Credits)</p>
                    </div>
                    <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
                      <p className="text-[10px] text-slate-400 font-mono">CSE4001</p>
                      <p className="font-semibold text-white truncate">Cryptography & Security</p>
                      <p className="text-emerald-400 font-bold text-xs mt-1">Grade: A+ (4 Credits)</p>
                    </div>
                  </div>
                </div>

                {/* Base58 Unique ID Banner */}
                <div className="p-3 bg-[#050811] rounded-xl border border-slate-800/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-5">
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">
                      Solana Base58 Credential Identifier
                    </span>
                    <p className="font-mono text-xs text-white truncate">{cert.id}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(cert.id);
                      alert("Copied Base58 Credential ID!");
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0"
                  >
                    Copy Base58 ID
                  </button>
                </div>

                {/* Exclusive Student Actions (QR, Selective Share, Download PDF) */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openQrModal(cert)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Verification QR
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCertForShare(cert);
                        setGeneratedShareLink("");
                      }}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Selective Share
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => downloadOfficialPDF(cert)}
                    className={`px-5 py-2.5 text-white rounded-xl text-xs font-bold transition shadow-lg cursor-pointer flex items-center gap-2 ${
                      isRevoked ? "bg-red-700 hover:bg-red-800" : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    {isRevoked ? "Download (Revoked Copy)" : "Download Official PDF"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* SELECTIVE DISCLOSURE MODAL */}
        {activeCertForShare && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0c1322] border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5">
              <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white">
                    Selective Disclosure Share for {activeCertForShare.studentName}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Choose which data fields to reveal to recruiters without exposing other details.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveCertForShare(null)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Claims Checkboxes */}
              <div>
                <p className="text-[11px] uppercase font-bold text-purple-400 tracking-wider mb-2">
                  Step 1: Select Information Claims to Disclose
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <label className="flex items-center gap-2 p-2.5 bg-[#050811] rounded-xl border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFields.studentName}
                      onChange={(e) => setSelectedFields({ ...selectedFields, studentName: e.target.checked })}
                      className="accent-purple-600"
                    />
                    <span>Student Name ({activeCertForShare.studentName})</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-[#050811] rounded-xl border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFields.degree}
                      onChange={(e) => setSelectedFields({ ...selectedFields, degree: e.target.checked })}
                      className="accent-purple-600"
                    />
                    <span>Program ({activeCertForShare.degree})</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-[#050811] rounded-xl border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFields.branch}
                      onChange={(e) => setSelectedFields({ ...selectedFields, branch: e.target.checked })}
                      className="accent-purple-600"
                    />
                    <span>Branch (Computer Science)</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-[#050811] rounded-xl border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFields.cgpa}
                      onChange={(e) => setSelectedFields({ ...selectedFields, cgpa: e.target.checked })}
                      className="accent-purple-600"
                    />
                    <span>CGPA ({activeCertForShare.cgpa || "3.92"})</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-[#050811] rounded-xl border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFields.rollNumber}
                      onChange={(e) => setSelectedFields({ ...selectedFields, rollNumber: e.target.checked })}
                      className="accent-purple-600"
                    />
                    <span>Roll Number ({activeCertForShare.studentId})</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-[#050811] rounded-xl border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFields.subjectGrades}
                      onChange={(e) => setSelectedFields({ ...selectedFields, subjectGrades: e.target.checked })}
                      className="accent-purple-600"
                    />
                    <span>Individual Subject Grades</span>
                  </label>
                </div>
              </div>

              {/* Time Duration Dropdown */}
              <div>
                <p className="text-[11px] uppercase font-bold text-purple-400 tracking-wider mb-2">
                  Step 2: Choose Sharing Access Duration
                </p>
                <select
                  value={shareDuration}
                  onChange={(e) => setShareDuration(e.target.value)}
                  className="w-full bg-[#050811] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="1">1 Hour Temporary Access</option>
                  <option value="24">24 Hours Access (Default)</option>
                  <option value="48">2 Days Access</option>
                  <option value="168">7 Days Access</option>
                  <option value="permanent">Until Manually Revoked (Permanent)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleGenerateShare}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition cursor-pointer"
              >
                Generate Selective Share Link & QR
              </button>

              {generatedShareLink && (
                <div className="p-3 bg-[#050811] border border-slate-800 rounded-xl space-y-2">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Generated Verification Link:</span>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={generatedShareLink}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-purple-300 font-mono truncate"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedShareLink);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      {copied ? "Copied!" : "Copy Link"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* QR CODE POPUP */}
        {activeQrModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0c1322] border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center relative">
              <button
                type="button"
                onClick={() => setActiveQrModal(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
              <h3 className="text-lg font-bold text-white mt-1 mb-1">{activeQrModal.studentName}</h3>
              <p className="text-xs text-slate-400 mb-4">{activeQrModal.docType}</p>

              <div className="p-3 bg-white rounded-2xl inline-block shadow-inner mb-4">
                {qrModalDataUrl && <img src={qrModalDataUrl} alt="Credential QR" className="w-56 h-56" />}
              </div>

              <button
                type="button"
                onClick={() => setActiveQrModal(null)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}