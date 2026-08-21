"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import { getAllCertificates } from "../../lib/certificateStore";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";

export default function StudentVault() {
  const [mounted, setMounted] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const [studentCerts, setStudentCerts] = useState([]);
  const [activeQrModal, setActiveQrModal] = useState(null);
  const [qrModalDataUrl, setQrModalDataUrl] = useState("");
  const [copiedId, setCopiedId] = useState("");

  useEffect(() => {
    setMounted(true);
    if (user) {
      const all = getAllCertificates();
      const matched = all.filter(
        (c) =>
          (c.studentEmail && c.studentEmail.toLowerCase() === user.username.toLowerCase()) ||
          (c.studentId && c.studentId.toLowerCase() === user.username.toLowerCase()) ||
          (c.studentId && user.studentId && c.studentId.toLowerCase() === user.studentId.toLowerCase()) ||
          (c.studentKey && user.walletKey && c.studentKey.toLowerCase() === user.walletKey.toLowerCase())
      );
      setStudentCerts(matched);
    }
  }, [user]);

  const openQrModal = async (cert) => {
    setActiveQrModal(cert);
    const qrData = JSON.stringify({
      credentialId: cert.id,
      docType: cert.docType,
      hash: cert.hash,
      studentId: cert.studentId,
      studentKey: cert.studentKey,
      timestamp: cert.timestamp,
    });
    const url = await QRCode.toDataURL(qrData, { width: 280, margin: 1 });
    setQrModalDataUrl(url);
  };

  const copyShareLink = (certId) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const shareableUrl = `${origin}?credId=${certId}`;
    navigator.clipboard.writeText(shareableUrl);
    setCopiedId(certId);
    setTimeout(() => setCopiedId(""), 2500);
  };

  const downloadCertificatePDF = async (record) => {
    const qrData = JSON.stringify({
      credentialId: record.id,
      docType: record.docType,
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

    if (record.docType === "DEGREE CERTIFICATE") {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = 297;
      const pageHeight = 210;

      doc.setFillColor(254, 252, 246);
      doc.rect(0, 0, pageWidth, pageHeight, "F");

      doc.setDrawColor(180, 140, 60);
      doc.setLineWidth(2.5);
      doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.8);
      doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

      doc.setFont("times", "bold");
      doc.setFontSize(24);
      doc.setTextColor(15, 23, 42);
      doc.text(
        record.institution ? record.institution.toUpperCase() : "SOLANA TECHNICAL UNIVERSITY",
        pageWidth / 2,
        32,
        { align: "center" }
      );

      doc.setFont("times", "bolditalic");
      doc.setFontSize(28);
      doc.setTextColor(16, 100, 70);
      doc.text(record.studentName, pageWidth / 2, 70, { align: "center" });

      doc.setFont("times", "bold");
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42);
      doc.text(record.degree, pageWidth / 2, 104, { align: "center" });

      doc.setFont("times", "normal");
      doc.setFontSize(11);
      doc.setTextColor(51, 65, 85);
      doc.text(`CGPA: ${record.cgpa} / 10.0`, pageWidth / 2, 114, { align: "center" });

      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(22, 138, 175, 24, 2, 2, "FD");

      doc.setFont("courier", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Credential ID : ${record.id}`, 26, 145);
      doc.text(`SHA-256 Digest : ${record.hash}`, 26, 151);

      doc.addImage(qrDataUrl, "PNG", pageWidth - 65, 134, 42, 42);
      doc.save(`degree_certificate_${record.studentId}.pdf`);
      return;
    }

    if (record.docType === "MIGRATION CERTIFICATE") {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = 210;

      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 35, "F");

      doc.setFont("times", "bold");
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text(
        record.institution ? record.institution.toUpperCase() : "SOLANA TECHNICAL UNIVERSITY",
        pageWidth / 2,
        18,
        { align: "center" }
      );

      doc.setFont("times", "bold");
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42);
      doc.text("MIGRATION CERTIFICATE", pageWidth / 2, 72, { align: "center" });

      const introText = `This is to certify that ${record.studentName} (ID: ${record.studentId}) is cleared for Institution Migration.`;
      const splitIntro = doc.splitTextToSize(introText, pageWidth - 36);
      doc.text(splitIntro, 18, 90);

      doc.addImage(qrDataUrl, "PNG", pageWidth - 62, 148, 36, 36);
      doc.save(`migration_certificate_${record.studentId}.pdf`);
      return;
    }

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = 210;

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("OFFICIAL ACADEMIC TRANSCRIPT", pageWidth / 2, 22, { align: "center" });

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.text(`Student Name: ${record.studentName}`, 20, 62);
    doc.text(`Registration ID: ${record.studentId}`, 20, 74);
    doc.text(`Degree Program: ${record.degree}`, 20, 86);
    doc.text(`CGPA / Grade: ${record.cgpa}`, 20, 98);
    doc.text(`Unique Credential ID: ${record.id}`, 20, 134);

    doc.addImage(qrDataUrl, "PNG", 130, 170, 55, 55);
    doc.save(`transcript_${record.studentId}.pdf`);
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
        
        {/* Profile Overview Header Card */}
        <div className="bg-gradient-to-r from-slate-900 via-[#0c1322] to-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xl">
              {user.name ? user.name.charAt(0) : "S"}
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                {user.name}
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-medium uppercase tracking-wider">
                  KYC Verified
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Roll ID: <span className="text-slate-200 font-mono font-semibold">{user.studentId || "CS-2026"}</span> • Email: <span className="text-slate-200">{user.username}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-[#050811] border border-slate-800 px-4 py-2 rounded-xl text-right">
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Vault Assets</p>
              <p className="text-lg font-black text-emerald-400">{studentCerts.length} Verified Records</p>
            </div>
          </div>
        </div>

        {/* Credential Records */}
        {studentCerts.length === 0 ? (
          <div className="text-center py-20 bg-[#0c1322] border border-dashed border-slate-800 rounded-2xl p-8">
            <div className="h-12 w-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-white mb-1">No Records Found In Vault</h3>
            <p className="text-slate-400 text-xs">Credentials anchored to your student account will automatically appear here upon university issuance.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {studentCerts.map((cert) => (
              <div
                key={cert.id}
                className="bg-[#0c1322] border border-slate-800 hover:border-slate-700 rounded-2xl p-6 shadow-2xl transition-all"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-4 mb-5 gap-3">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" />
                    <div>
                      <span className="text-xs font-extrabold uppercase tracking-wider text-purple-400">
                        {cert.docType}
                      </span>
                      <h2 className="text-lg font-bold text-white">{cert.degree || cert.docType}</h2>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-[11px] font-bold px-3 py-1 rounded-full">
                      Solana Devnet State: Confirmed
                    </span>
                    <span className="text-xs text-slate-400">
                      Issued: {new Date(cert.timestamp * 1000).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Main Data Breakdown Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs mb-5">
                  <div className="bg-[#050811] p-3.5 rounded-xl border border-slate-800/80">
                    <p className="text-slate-500 font-semibold mb-0.5">Issuing University</p>
                    <p className="font-bold text-slate-200 text-sm">{cert.institution || "Solana Technical University"}</p>
                  </div>
                  <div className="bg-[#050811] p-3.5 rounded-xl border border-slate-800/80">
                    <p className="text-slate-500 font-semibold mb-0.5">Academic CGPA / Status</p>
                    <p className="font-bold text-emerald-400 text-sm">{cert.cgpa ? `${cert.cgpa} / 10.0` : "Cleared"}</p>
                  </div>
                  <div className="bg-[#050811] p-3.5 rounded-xl border border-slate-800/80">
                    <p className="text-slate-500 font-semibold mb-0.5">Registration Number</p>
                    <p className="font-bold text-slate-200 text-sm font-mono">{cert.studentId}</p>
                  </div>
                  <div className="bg-[#050811] p-3.5 rounded-xl border border-slate-800/80">
                    <p className="text-slate-500 font-semibold mb-0.5">Anchoring Timestamp</p>
                    <p className="font-mono text-slate-300 text-xs">{new Date(cert.timestamp * 1000).toLocaleTimeString()} UTC</p>
                  </div>
                </div>

                {/* Cryptographic Key / ID Inspector */}
                <div className="space-y-2 mb-6">
                  <div className="p-3 bg-[#050811] rounded-xl border border-slate-800/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">Unique Base58 Credential Identifier</span>
                      <p className="font-mono text-xs text-white truncate">{cert.id}</p>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(cert.id);
                        setCopiedId(cert.id);
                        setTimeout(() => setCopiedId(""), 2000);
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition shrink-0"
                    >
                      {copiedId === cert.id ? "Copied ID!" : "Copy Credential ID"}
                    </button>
                  </div>

                  <div className="p-3 bg-[#050811] rounded-xl border border-slate-800/80 flex justify-between items-center text-xs">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Cryptographic SHA-256 Seal</span>
                      <p className="font-mono text-[11px] text-emerald-400 truncate">{cert.hash}</p>
                    </div>
                  </div>
                </div>

                {/* Interactive Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openQrModal(cert)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                      Instant Verification QR
                    </button>

                    <button
                      onClick={() => copyShareLink(cert.id)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      Share Direct Link
                    </button>
                  </div>

                  <button
                    onClick={() => downloadCertificatePDF(cert)}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-lg flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Official PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QR Code Presentation Popup Modal */}
      {activeQrModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c1322] border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center relative animate-fade-in">
            <button
              onClick={() => setActiveQrModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold"
            >
              ✕
            </button>
            <span className="text-[10px] font-extrabold uppercase text-emerald-400 tracking-wider">
              Zero-Knowledge Pass
            </span>
            <h3 className="text-lg font-bold text-white mt-1 mb-1">{activeQrModal.studentName}</h3>
            <p className="text-xs text-slate-400 mb-4">{activeQrModal.docType}</p>

            <div className="p-3 bg-white rounded-2xl inline-block shadow-inner mb-4">
              {qrModalDataUrl && <img src={qrModalDataUrl} alt="Credential QR" className="w-56 h-56" />}
            </div>

            <p className="text-[11px] text-slate-400 mb-4">
              Scan with any mobile camera or the TrustAnchor verifier to confirm on-chain authenticity.
            </p>

            <button
              onClick={() => setActiveQrModal(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
            >
              Close Window
            </button>
          </div>
        </div>
      )}
    </div>
  );
}