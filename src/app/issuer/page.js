"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import { BN, getProvider, getProgram, PROGRAM_ID } from "../../lib/solana";
import { useAuth } from "../../context/AuthContext";
import {
  saveCertificate,
  getAllCertificates,
  updateCertificateStatus,
  updateCertificateRecord,
  deleteCertificateRecord,
} from "../../lib/certificateStore";
import { sendIssuanceEmail } from "../../lib/emailService";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";

export default function IssuerPortal() {
  const [mounted, setMounted] = useState(false);
  const { user, loading: authLoading, registerStudentAccount } = useAuth();
  const wallet = useWallet();
  const { connected, publicKey } = wallet;

  const [formData, setFormData] = useState({
    institution: "Solana Technical University",
    docType: "OFFICIAL ACADEMIC TRANSCRIPT",
    studentName: "Alex Morgan",
    studentId: "CS-2026-8841",
    studentEmail: "alex.morgan@student.edu",
    studentPassword: "password123",
    degree: "Bachelor of Technology in Computer Science",
    cgpa: "3.92",
    studentKey: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  });

  const [issuedHistory, setIssuedHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [createdStudentNotice, setCreatedStudentNotice] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Edit / Inspect Modal States
  const [editingRecord, setEditingRecord] = useState(null);
  const [inspectingRecord, setInspectingRecord] = useState(null);

  useEffect(() => {
    setMounted(true);
    setIssuedHistory(getAllCertificates());
    if (user?.institution) {
      setFormData((prev) => ({ ...prev, institution: user.institution }));
    }
  }, [user]);

  const generatePDF = async (record) => {
    const qrData = JSON.stringify({
      credentialId: record.id,
      docType: record.docType,
      institution: record.institution,
      hash: record.hash,
      studentId: record.studentId,
      studentKey: record.studentKey,
      status: record.status || "VALID",
      timestamp: record.timestamp,
    });
    const qrDataUrl = await QRCode.toDataURL(qrData, { margin: 1 });
    const formattedDate = new Date(record.timestamp * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const instName = (record.institution || "SOLANA TECHNICAL UNIVERSITY").toUpperCase();

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
      doc.text(instName, pageWidth / 2, 32, { align: "center" });

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

      doc.addImage(qrDataUrl, "PNG", pageWidth - 65, 134, 42, 42);
      doc.save(`degree_${record.studentId}.pdf`);
      return;
    }

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = 210;

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(instName, pageWidth / 2, 22, { align: "center" });

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Document: ${record.docType}`, 20, 50);
    doc.text(`Student: ${record.studentName}`, 20, 62);
    doc.text(`ID: ${record.studentId}`, 20, 74);
    doc.text(`CGPA / Status: ${record.cgpa || "Cleared"}`, 20, 86);
    doc.text(`Credential ID: ${record.id}`, 20, 98);

    doc.addImage(qrDataUrl, "PNG", 130, 150, 55, 55);
    doc.save(`cert_${record.studentId}.pdf`);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingRecord) return;

    const updated = updateCertificateRecord(editingRecord.id, editingRecord);
    setIssuedHistory(updated);
    setEditingRecord(null);
    alert("Record updated successfully in the ledger database.");
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Delete record for ${name}? This will remove it from the local registry.`)) {
      const updated = deleteCertificateRecord(id);
      setIssuedHistory(updated);
    }
  };

  const handleRevoke = (certId, studentName) => {
    const reason = window.prompt(
      `Confirm Revocation of Certificate for ${studentName}?\nEnter reason:`,
      "Academic Correction & Grade Update"
    );

    if (reason !== null) {
      const updated = updateCertificateStatus(certId, "REVOKED", reason);
      setIssuedHistory(updated);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setStatus("");
    setCreatedStudentNotice(null);

    if (!connected || !publicKey) {
      setErrorMsg("Please connect your authorized admin wallet first.");
      return;
    }

    setLoading(true);
    try {
      let studentPubkey;
      try {
        studentPubkey = new PublicKey(formData.studentKey);
      } catch {
        throw new Error("Invalid Student Solana Public Key base58 string.");
      }

      const uniqueCredKeypair = Keypair.generate();
      const credentialId = uniqueCredKeypair.publicKey.toBase58();

      const now = Math.floor(Date.now() / 1000);
      const rawPayload = `${formData.institution}|${formData.docType}|${formData.studentName}|${formData.studentId}|${formData.degree}|${formData.cgpa}|${formData.studentKey}|${credentialId}|${now}`;
      const msgBuffer = new TextEncoder().encode(rawPayload);
      const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      setStatus("Submitting to Solana Blockchain...");

      const provider = getProvider(wallet);
      const program = getProgram(provider);

      if (program && program.methods?.issueCertificate) {
        try {
          const [certPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("certificate"), Uint8Array.from(hashArray)],
            PROGRAM_ID
          );

          await program.methods
            .issueCertificate(hashArray, studentPubkey, new BN(now))
            .accounts({
              certificate: certPda,
              authority: publicKey,
              systemProgram: SystemProgram.programId,
            })
            .rpc();
        } catch (onChainErr) {
          console.warn("On-chain note (Mock/Devnet mode):", onChainErr.message);
        }
      }

      registerStudentAccount({
        username: formData.studentEmail.trim(),
        password: formData.studentPassword,
        role: "student",
        name: formData.studentName,
        studentId: formData.studentId,
        walletKey: formData.studentKey,
      });

      const certRecord = {
        id: credentialId,
        hash: hashHex,
        status: "VALID",
        docType: formData.docType,
        institution: formData.institution.trim(),
        studentName: formData.studentName,
        studentId: formData.studentId,
        studentEmail: formData.studentEmail.trim(),
        degree: formData.degree,
        cgpa: formData.cgpa,
        studentKey: formData.studentKey,
        issuerAuthority: publicKey.toBase58(),
        timestamp: now,
      };

      const updated = saveCertificate(certRecord);
      setIssuedHistory(updated);

      await generatePDF(certRecord);

      await sendIssuanceEmail({
        studentName: formData.studentName,
        studentEmail: formData.studentEmail.trim(),
        docType: formData.docType,
        institution: formData.institution.trim(),
        credentialId,
        studentPassword: formData.studentPassword,
        adminEmail: user?.username || "admin@university.edu",
      });

      setStatus(`Certificate issued & record stored successfully!`);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-8 w-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== "university") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="p-8 bg-[#0c1322] border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-2">Restricted Access</h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            The Issuer Portal is reserved for authorized University accounts.
          </p>
          <Link
            href="/login"
            className="inline-block w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition"
          >
            Go to University Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050811] text-white flex flex-col items-center pt-8 px-4 pb-20">
      {/* Issuance Form */}
      <div className="w-full max-w-2xl bg-[#0f172a] border border-gray-800 rounded-2xl p-8 shadow-2xl mb-12">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Issuer Portal</h1>
            <p className="text-xs text-purple-400 font-medium mt-0.5">
              Logged in: {user.institution || formData.institution} ({user.name})
            </p>
          </div>
          <div className="min-w-[140px] flex justify-end">
            <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 !rounded-lg !px-4 !py-2 !text-sm !font-semibold" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">
              Issuing University / Institution Name
            </label>
            <input
              type="text"
              value={formData.institution}
              onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
              className="w-full bg-[#0a0f1d] border border-gray-700 rounded-lg px-4 py-2 text-sm text-white font-semibold focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">
              Document Type
            </label>
            <select
              value={formData.docType}
              onChange={(e) => setFormData({ ...formData, docType: e.target.value })}
              className="w-full bg-[#0a0f1d] border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
            >
              <option value="OFFICIAL ACADEMIC TRANSCRIPT">Official Academic Transcript</option>
              <option value="DEGREE CERTIFICATE">Degree Certificate</option>
              <option value="MIGRATION CERTIFICATE">Migration Certificate</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Student Full Name</label>
              <input
                type="text"
                value={formData.studentName}
                onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                className="w-full bg-[#0a0f1d] border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Registration ID / Roll No</label>
              <input
                type="text"
                value={formData.studentId}
                onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                className="w-full bg-[#0a0f1d] border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                required
              />
            </div>
          </div>

          <div className="p-4 bg-[#0a0f1d] border border-purple-900/50 rounded-xl space-y-3">
            <p className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
              Student Vault Login Credentials
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Student Email Address</label>
                <input
                  type="email"
                  value={formData.studentEmail}
                  onChange={(e) => setFormData({ ...formData, studentEmail: e.target.value })}
                  className="w-full bg-[#050811] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Temporary Password</label>
                <input
                  type="text"
                  value={formData.studentPassword}
                  onChange={(e) => setFormData({ ...formData, studentPassword: e.target.value })}
                  className="w-full bg-[#050811] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
            </div>
          </div>

          {formData.docType !== "MIGRATION CERTIFICATE" && (
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Degree</label>
                <input
                  type="text"
                  value={formData.degree}
                  onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                  className="w-full bg-[#0a0f1d] border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">CGPA</label>
                <input
                  type="text"
                  value={formData.cgpa}
                  onChange={(e) => setFormData({ ...formData, cgpa: e.target.value })}
                  className="w-full bg-[#0a0f1d] border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-400 mb-1">Student Solana Public Key (Base58)</label>
            <input
              type="text"
              value={formData.studentKey}
              onChange={(e) => setFormData({ ...formData, studentKey: e.target.value })}
              className="w-full bg-[#0a0f1d] border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-900/40 border border-red-700 text-red-200 text-xs rounded-lg">
              {errorMsg}
            </div>
          )}

          {status && (
            <div className="p-3 bg-emerald-900/40 border border-emerald-700 text-emerald-200 text-xs rounded-lg">
              {status}
            </div>
          )}

          <div className="pt-4">
            {!connected ? (
              <div className="flex justify-center">
                <WalletMultiButton className="w-full !bg-purple-600 hover:!bg-purple-700 !justify-center !rounded-lg !py-3 !text-sm !font-semibold">
                  Connect Admin Wallet
                </WalletMultiButton>
              </div>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
              >
                {loading ? "Processing..." : `Sign, Anchor & Mail ${formData.docType}`}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* University Issuance Registry with Full View/Edit Database Actions */}
      <div className="w-full max-w-5xl bg-[#0c1322] border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-bold text-white">Live Ledger Database Registry</h2>
            <p className="text-xs text-slate-400">View, inspect raw JSON, update fields, or revoke active credentials</p>
          </div>
          <span className="bg-purple-950/60 border border-purple-800 text-purple-300 font-bold px-3.5 py-1 rounded-full text-xs">
            {issuedHistory.length} Database Rows
          </span>
        </div>

        {issuedHistory.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl">
            No credentials issued yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 bg-slate-900/50">
                <tr>
                  <th className="p-3">Status</th>
                  <th className="p-3">Institution</th>
                  <th className="p-3">Student Details</th>
                  <th className="p-3">Document Type</th>
                  <th className="p-3">Credential ID</th>
                  <th className="p-3 text-right">Database Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {issuedHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition">
                    <td className="p-3">
                      {item.status === "REVOKED" ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950/80 border border-red-800 text-red-300">
                          REVOKED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 border border-emerald-800 text-emerald-300">
                          ACTIVE
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-semibold text-purple-300 max-w-[140px] truncate">{item.institution}</td>
                    <td className="p-3 font-semibold text-white">
                      {item.studentName}
                      <span className="block text-[10px] text-emerald-400 font-mono">{item.studentEmail}</span>
                    </td>
                    <td className="p-3 text-slate-300">{item.docType}</td>
                    <td className="p-3 font-mono text-[11px] text-slate-400">
                      {item.id.slice(0, 8)}...{item.id.slice(-6)}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setInspectingRecord(item)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded text-[11px] font-semibold transition"
                          title="View Full JSON Record"
                        >
                          View
                        </button>
                        <button
                          onClick={() => setEditingRecord({ ...item })}
                          className="bg-blue-950/60 hover:bg-blue-900 border border-blue-800 text-blue-300 px-2 py-1 rounded text-[11px] font-semibold transition"
                          title="Edit Database Row"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => generatePDF(item)}
                          className="bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 px-2 py-1 rounded text-[11px] font-semibold transition"
                          title="Download PDF"
                        >
                          PDF
                        </button>
                        {item.status !== "REVOKED" ? (
                          <button
                            onClick={() => handleRevoke(item.id, item.studentName)}
                            className="bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 px-2 py-1 rounded text-[11px] font-semibold transition"
                            title="Revoke Certificate"
                          >
                            Revoke
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDelete(item.id, item.studentName)}
                            className="bg-red-950/40 hover:bg-red-900 text-red-400 px-2 py-1 rounded text-[11px] font-semibold transition"
                            title="Delete Record"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c1322] border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Edit Ledger Record</h3>
            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Student Name</label>
                <input
                  type="text"
                  value={editingRecord.studentName}
                  onChange={(e) => setEditingRecord({ ...editingRecord, studentName: e.target.value })}
                  className="w-full bg-[#050811] border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Institution</label>
                <input
                  type="text"
                  value={editingRecord.institution}
                  onChange={(e) => setEditingRecord({ ...editingRecord, institution: e.target.value })}
                  className="w-full bg-[#050811] border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Degree Program</label>
                  <input
                    type="text"
                    value={editingRecord.degree || ""}
                    onChange={(e) => setEditingRecord({ ...editingRecord, degree: e.target.value })}
                    className="w-full bg-[#050811] border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">CGPA / Grade</label>
                  <input
                    type="text"
                    value={editingRecord.cgpa || ""}
                    onChange={(e) => setEditingRecord({ ...editingRecord, cgpa: e.target.value })}
                    className="w-full bg-[#050811] border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Status</label>
                <select
                  value={editingRecord.status || "VALID"}
                  onChange={(e) => setEditingRecord({ ...editingRecord, status: e.target.value })}
                  className="w-full bg-[#050811] border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="VALID">VALID (Active)</option>
                  <option value="REVOKED">REVOKED</option>
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INSPECT RAW RECORD MODAL */}
      {inspectingRecord && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c1322] border border-slate-800 rounded-2xl p-6 max-w-xl w-full shadow-2xl">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-white">Database Row Inspector</h3>
              <button onClick={() => setInspectingRecord(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <pre className="bg-[#050811] p-4 rounded-xl border border-slate-800 text-[11px] text-emerald-400 font-mono overflow-auto max-h-80">
              {JSON.stringify(inspectingRecord, null, 2)}
            </pre>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setInspectingRecord(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}