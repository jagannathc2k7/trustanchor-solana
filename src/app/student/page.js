"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { jsPDF } from "jspdf";
import { useAuth } from "../../context/AuthContext";
import { fetchAllCertificates, createSelectiveShareTokenDb } from "../../lib/certificateStore";

export default function StudentVault() {
  const { user, loading: authLoading } = useAuth();
  const [certs, setCerts] = useState([]);
  const [selectedCert, setSelectedCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  // Selective Disclosure Modal State
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [disclosedFields, setDisclosedFields] = useState({
    studentName: true,
    rollNumber: false,
    degree: true,
    cgpa: false,
  });
  const [expiryHours, setExpiryHours] = useState("24");
  const [generatedLink, setGeneratedLink] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  const loadStudentCerts = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const allCerts = await fetchAllCertificates();
      
      const cleanUserEmail = user.username?.trim().toLowerCase();
      const cleanUserId = user.studentId?.trim().toLowerCase();
      const cleanUserName = user.name?.trim().toLowerCase();

      const studentCerts = allCerts.filter((c) => {
        const cEmail = c.studentEmail?.trim().toLowerCase();
        const cId = c.studentId?.trim().toLowerCase();
        const cName = c.studentName?.trim().toLowerCase();

        return (
          (cleanUserEmail && cEmail === cleanUserEmail) ||
          (cleanUserId && cId === cleanUserId) ||
          (cleanUserName && cName === cleanUserName)
        );
      });

      setCerts(studentCerts);

      if (studentCerts.length > 0) {
        setSelectedCert((prev) => {
          if (!prev) return studentCerts[0];
          const updated = studentCerts.find((c) => c.id === prev.id);
          return updated || studentCerts[0];
        });
      } else {
        setSelectedCert(null);
      }
    } catch (err) {
      console.error("Error loading student records:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadStudentCerts();
    const handleFocus = () => loadStudentCerts();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loadStudentCerts]);

  const handleGenerateShare = async () => {
    if (!selectedCert) return;
    const token = await createSelectiveShareTokenDb({
      certId: selectedCert.id,
      selectedFields: disclosedFields,
      durationHours: expiryHours,
    });

    const fullUrl = `${window.location.origin}/?token=${token}`;
    setGeneratedLink(fullUrl);
  };

  const copyToClipboard = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  const handleDownloadPDF = () => {
    if (!selectedCert) return;
    setPdfGenerating(true);

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const isRevoked = selectedCert.status === "REVOKED";

      doc.setDrawColor(124, 58, 237);
      doc.setLineWidth(1.2);
      doc.rect(10, 10, 190, 277);

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.4);
      doc.rect(13, 13, 184, 271);

      if (isRevoked) {
        doc.setTextColor(239, 68, 68);
        doc.setFontSize(36);
        doc.setFont("helvetica", "bold");
        doc.text("REVOKED / INVALID", 35, 145, { angle: 45 });
      }

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text((selectedCert.institution || "INSTITUTION").toUpperCase(), 105, 30, { align: "center" });

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text("OFFICIAL VERIFIED ACADEMIC CREDENTIAL", 105, 36, { align: "center" });

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(25, 42, 185, 42);

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      doc.text(selectedCert.docType || "DEGREE CERTIFICATE", 105, 54, { align: "center" });

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text("This credential verifies that the following record is registered in the ledger:", 105, 64, { align: "center" });

      const rows = [
        { label: "Student Full Name", value: selectedCert.studentName || "N/A" },
        { label: "Registration / Roll ID", value: selectedCert.studentId || "N/A" },
        { label: "Student Email", value: selectedCert.studentEmail || "N/A" },
        { label: "Degree / Major", value: selectedCert.degree || selectedCert.docType || "N/A" },
        { label: "Cumulative CGPA", value: `${selectedCert.cgpa || "N/A"} / 10.0` },
        { label: "Credential Status", value: selectedCert.status || "VALID" },
        { label: "Issuance Date", value: new Date((selectedCert.timestamp || Date.now() / 1000) * 1000).toLocaleDateString() },
        { label: "Credential ID", value: selectedCert.id || "N/A" },
      ];

      let startY = 75;
      rows.forEach((row, i) => {
        if (i % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(25, startY - 4, 160, 9.5, "F");
        }
        doc.setDrawColor(241, 245, 249);
        doc.rect(25, startY - 4, 160, 9.5, "S");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text(row.label, 28, startY + 2.5);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(15, 23, 42);
        doc.text(String(row.value), 90, startY + 2.5);

        startY += 9.5;
      });

      startY += 10;
      doc.setFillColor(245, 243, 255);
      doc.rect(25, startY, 160, 22, "F");
      doc.setDrawColor(196, 181, 253);
      doc.rect(25, startY, 160, 22, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(109, 40, 217);
      doc.text("CRYPTOGRAPHIC SHA-256 STATE HASH", 30, startY + 6);

      doc.setFont("courier", "normal");
      doc.setFontSize(7);
      doc.setTextColor(51, 65, 85);
      const splitHash = doc.splitTextToSize(selectedCert.hash || "0x000000000000", 150);
      doc.text(splitHash, 30, startY + 12);

      const fileName = `${(selectedCert.studentName || "credential").replace(/\s+/g, "_")}_Transcript.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setPdfGenerating(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-400 text-xs">
        Loading Student Identity Vault...
      </div>
    );
  }

  if (!user || user.role !== "student") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="p-8 bg-[#0c1322] border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-2">Student Access Required</h2>
          <p className="text-xs text-slate-400 mb-6">
            Please log in with a student account to view your credentials.
          </p>
          <Link
            href="/login"
            className="inline-block w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4 max-w-5xl mx-auto space-y-6">
      <div className="p-6 bg-[#0c1322] border border-white/[0.06] rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest font-bold block mb-1">
            Student Identity Vault
          </span>
          <h1 className="text-2xl font-black text-white">{user.name || "Student"}</h1>
          <p className="text-xs text-slate-400 mt-0.5">{user.username}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadStudentCerts}
            className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold transition cursor-pointer"
          >
            ↻ Refresh Vault
          </button>
          <span className="text-xs px-3 py-1.5 rounded-xl bg-purple-950/80 border border-purple-700 text-purple-300 font-bold">
            {certs.length} Credential(s)
          </span>
        </div>
      </div>

      {certs.length === 0 ? (
        <div className="text-center py-16 bg-[#0c1322] border border-slate-800 rounded-2xl space-y-3">
          <p className="text-slate-400 text-sm">No credentials currently found for this student account.</p>
          <p className="text-xs text-slate-500">
            If your record was deleted or re-issued, click "Refresh Vault" or contact your university.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Credentials</h3>
            {certs.map((c) => {
              const isRevoked = c.status === "REVOKED";
              const isSelected = selectedCert?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCert(c)}
                  className={`p-4 rounded-xl border cursor-pointer transition ${
                    isSelected
                      ? "bg-purple-600/15 border-purple-500 shadow-lg shadow-purple-500/10"
                      : "bg-[#0c1322] border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-slate-400 block truncate max-w-[140px]">
                      {c.docType}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        isRevoked
                          ? "bg-red-950 border border-red-800 text-red-300"
                          : "bg-emerald-950 border border-emerald-800 text-emerald-300"
                      }`}
                    >
                      {isRevoked ? "REVOKED" : "VALID"}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white truncate">{c.degree || c.docType}</h4>
                  <p className="text-xs text-purple-400 font-medium mt-1">{c.institution}</p>
                </div>
              );
            })}
          </div>

          {selectedCert && (
            <div className="md:col-span-2 bg-[#0c1322] border border-slate-800 rounded-2xl p-6 space-y-6">
              {selectedCert.status === "REVOKED" ? (
                <div className="p-4 bg-red-950/60 border border-red-800 rounded-xl space-y-1">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-red-300 uppercase tracking-wider">Credential Status: Revoked</h4>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-red-900 border border-red-700 text-red-100 rounded">
                      INVALIDATED
                    </span>
                  </div>
                  <p className="text-xs text-red-200">
                    Reason: {selectedCert.revocationReason || "Academic Discrepancy & Invalidation registered by the issuing university."}
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-emerald-950/40 border border-emerald-800/80 rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Cryptographically Verified</h4>
                    <p className="text-[11px] text-emerald-400 mt-0.5">Tamper-Proof & Active in Ledger</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 bg-emerald-900/80 border border-emerald-700 text-emerald-200 font-bold rounded-lg">
                    ACTIVE
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-[#050811] p-3.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 text-[10px] block uppercase font-bold">Institution</span>
                  <span className="font-semibold text-white mt-0.5 block">{selectedCert.institution}</span>
                </div>
                <div className="bg-[#050811] p-3.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 text-[10px] block uppercase font-bold">Registration / Roll No</span>
                  <span className="font-semibold text-white mt-0.5 block font-mono">{selectedCert.studentId}</span>
                </div>
                <div className="bg-[#050811] p-3.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 text-[10px] block uppercase font-bold">Program / Degree</span>
                  <span className="font-semibold text-white mt-0.5 block">{selectedCert.degree || selectedCert.docType}</span>
                </div>
                <div className="bg-[#050811] p-3.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 text-[10px] block uppercase font-bold">Cumulative CGPA</span>
                  <span className="font-bold text-emerald-400 mt-0.5 block text-sm">{selectedCert.cgpa} / 10.0</span>
                </div>
              </div>

              <div className="bg-[#050811] p-3.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] block uppercase font-bold">SHA-256 State Hash</span>
                <span className="font-mono text-[11px] text-purple-300 break-all block mt-1">
                  {selectedCert.hash}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={pdfGenerating}
                  className="py-3 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
                >
                  {pdfGenerating ? "Generating..." : "📄 Download Official PDF"}
                </button>
                <button
                  type="button"
                  onClick={() => setShareModalOpen(true)}
                  disabled={selectedCert.status === "REVOKED"}
                  className="py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
                >
                  {selectedCert.status === "REVOKED" ? "🚫 Sharing Disabled (Revoked)" : "⚡ Selective Share Link & QR"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {shareModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c1322] border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Selective Disclosure Permissions</h3>
              <button
                type="button"
                onClick={() => {
                  setShareModalOpen(false);
                  setGeneratedLink("");
                }}
                className="text-slate-400 hover:text-white text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-400 leading-relaxed">
              Choose exactly which attributes third parties can inspect.
            </p>

            <div className="space-y-2 bg-[#050811] p-4 rounded-xl border border-slate-800">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-white font-semibold">Student Full Name</span>
                <input
                  type="checkbox"
                  checked={disclosedFields.studentName}
                  onChange={(e) => setDisclosedFields({ ...disclosedFields, studentName: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-0"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-white font-semibold">Degree / Major</span>
                <input
                  type="checkbox"
                  checked={disclosedFields.degree}
                  onChange={(e) => setDisclosedFields({ ...disclosedFields, degree: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-0"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-white font-semibold">Registration / Roll No</span>
                <input
                  type="checkbox"
                  checked={disclosedFields.rollNumber}
                  onChange={(e) => setDisclosedFields({ ...disclosedFields, rollNumber: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-0"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-white font-semibold">Cumulative CGPA</span>
                <input
                  type="checkbox"
                  checked={disclosedFields.cgpa}
                  onChange={(e) => setDisclosedFields({ ...disclosedFields, cgpa: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-0"
                />
              </label>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Access Expiration</label>
              <select
                value={expiryHours}
                onChange={(e) => setExpiryHours(e.target.value)}
                className="w-full bg-[#050811] border border-slate-800 rounded-lg p-2.5 text-white outline-none"
              >
                <option value="1">1 Hour Temporary Pass</option>
                <option value="24">24 Hours (Standard)</option>
                <option value="168">7 Days</option>
                <option value="permanent">Permanent Link</option>
              </select>
            </div>

            {!generatedLink ? (
              <button
                type="button"
                onClick={handleGenerateShare}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition cursor-pointer"
              >
                Generate Link
              </button>
            ) : (
              <div className="space-y-3 pt-2">
                <input
                  type="text"
                  readOnly
                  value={generatedLink}
                  className="w-full bg-[#050811] border border-slate-700 rounded-lg p-2.5 text-[11px] font-mono text-purple-300 outline-none"
                />
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition cursor-pointer"
                >
                  {copySuccess ? "Copied to Clipboard!" : "Copy Share Link"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}