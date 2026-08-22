"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { useAuth } from "../../context/AuthContext";
import { fetchAllCertificates, createSelectiveShareTokenDb } from "../../lib/certificateStore";

export default function StudentVault() {
  const { user, loading: authLoading } = useAuth();
  const [certs, setCerts] = useState([]);
  const [selectedCert, setSelectedCert] = useState(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    async function loadStudentCerts() {
      setLoading(true);
      const allCerts = await fetchAllCertificates();
      
      let studentCerts = allCerts.filter(
        (c) =>
          c.studentEmail?.toLowerCase() === user?.username?.toLowerCase() ||
          c.studentEmail?.toLowerCase() === user?.email?.toLowerCase() ||
          c.studentId === user?.studentId
      );

      if (studentCerts.length === 0 && user?.role === "student") {
        studentCerts = [
          {
            id: "cred_demo_alex_2026",
            hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            status: "VALID",
            docType: "OFFICIAL ACADEMIC TRANSCRIPT",
            institution: "VIT Chennai",
            studentName: user.name || "Alex Morgan",
            studentId: "CS-2026-8841",
            studentEmail: user.username || "alex.morgan@student.edu",
            degree: "Bachelor of Technology in Computer Science",
            cgpa: "3.92",
            timestamp: Math.floor(Date.now() / 1000),
          },
        ];
      }

      setCerts(studentCerts);
      if (studentCerts.length > 0) {
        setSelectedCert(studentCerts[0]);
      }
      setLoading(false);
    }

    if (user) {
      loadStudentCerts();
    }
  }, [user]);

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

  // PDF Generator Function
  const handleDownloadPDF = () => {
    if (!selectedCert) return;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const isRevoked = selectedCert.status === "REVOKED";

    // Certificate Background Border
    doc.setDrawColor(79, 70, 229);
    doc.setLineWidth(1.5);
    doc.rect(10, 10, 190, 277);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.rect(13, 13, 184, 271);

    // Watermark if Revoked
    if (isRevoked) {
      doc.setTextColor(239, 68, 68);
      doc.setFontSize(45);
      doc.setFont("helvetica", "bold");
      doc.text("REVOKED / INVALID", 35, 150, { angle: 45 });
    }

    // Header / Institution Title
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(selectedCert.institution.toUpperCase(), 105, 32, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("OFFICIAL VERIFIED ACADEMIC CREDENTIAL", 105, 38, { align: "center" });

    // Divider
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(25, 44, 185, 44);

    // Document Title
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(selectedCert.docType, 105, 56, { align: "center" });

    // Body Text
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("This document certifies that the following academic record has been registered:", 105, 68, { align: "center" });

    // Details Table
    doc.autoTable({
      startY: 78,
      margin: { left: 25, right: 25 },
      theme: "grid",
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      styles: {
        fontSize: 10,
        cellPadding: 4,
      },
      body: [
        ["Student Full Name", selectedCert.studentName],
        ["Registration / Roll ID", selectedCert.studentId],
        ["Student Email", selectedCert.studentEmail],
        ["Degree / Major", selectedCert.degree || selectedCert.docType],
        ["Cumulative CGPA", `${selectedCert.cgpa} / 10.0`],
        ["Issuance Status", selectedCert.status],
        ["Date Issued", new Date(selectedCert.timestamp * 1000).toLocaleDateString()],
        ["Credential ID", selectedCert.id],
      ],
    });

    const finalY = doc.lastAutoTable.finalY + 15;

    // State Hash & Security Box
    doc.setFillColor(248, 250, 252);
    doc.rect(25, finalY, 160, 24, "F");
    doc.setDrawColor(226, 232, 240);
    doc.rect(25, finalY, 160, 24, "S");

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text("CRYPTOGRAPHIC SHA-256 STATE HASH", 30, finalY + 7);

    doc.setFont("courier", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(selectedCert.hash, 30, finalY + 16);

    // Signatures
    const sigY = finalY + 45;
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.5);
    doc.line(30, sigY, 80, sigY);
    doc.line(130, sigY, 180, sigY);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("Authorized Signatory", 55, sigY + 5, { align: "center" });
    doc.text("University Registrar", 155, sigY + 5, { align: "center" });

    doc.save(`${selectedCert.studentName.replace(/\s+/g, "_")}_${selectedCert.docType.replace(/\s+/g, "_")}.pdf`);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-400 text-xs">
        Loading Student Vault...
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
      {/* Header Banner */}
      <div className="p-6 bg-[#0c1322] border border-white/[0.06] rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest font-bold block mb-1">
            Student Identity Vault
          </span>
          <h1 className="text-2xl font-black text-white">{user.name || "Student"}</h1>
          <p className="text-xs text-slate-400 mt-0.5">{user.username}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-300 font-bold">
            {certs.length} Credential(s) Issued
          </span>
        </div>
      </div>

      {certs.length === 0 ? (
        <div className="text-center py-16 bg-[#0c1322] border border-slate-800 rounded-2xl">
          <p className="text-slate-400 text-sm">No credentials have been issued to this student account yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* List of Certificates */}
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

          {/* Certificate Detail Panel */}
          {selectedCert && (
            <div className="md:col-span-2 bg-[#0c1322] border border-slate-800 rounded-2xl p-6 space-y-6">
              {/* Status Banner */}
              {selectedCert.status === "REVOKED" ? (
                <div className="p-4 bg-red-950/60 border border-red-800 rounded-xl">
                  <h4 className="text-xs font-bold text-red-300 uppercase tracking-wider">Credential Revoked</h4>
                  <p className="text-xs text-red-200 mt-1">
                    Reason: {selectedCert.revocationReason || "Academic Correction"}
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-emerald-950/40 border border-emerald-800/80 rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Cryptographically Verified</h4>
                    <p className="text-[11px] text-emerald-400 mt-0.5">Tamper-Proof & Active in Database</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 bg-emerald-900/80 border border-emerald-700 text-emerald-200 font-bold rounded-lg">
                    ACTIVE
                  </span>
                </div>
              )}

              {/* Data Grid */}
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

              {/* Hash Fingerprint */}
              <div className="bg-[#050811] p-3.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] block uppercase font-bold">SHA-256 State Hash</span>
                <span className="font-mono text-[11px] text-purple-300 break-all block mt-1">
                  {selectedCert.hash}
                </span>
              </div>

              {/* Action Buttons: PDF Download & Selective Share */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  className="py-3 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
                >
                  📄 Download Official PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShareModalOpen(true)}
                  disabled={selectedCert.status === "REVOKED"}
                  className="py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
                >
                  ⚡ Selective Share Link & QR
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selective Disclosure Modal */}
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
              Choose exactly which attributes third parties can inspect. Hidden attributes will remain completely inaccessible.
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