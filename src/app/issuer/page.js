"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import { BN, getProvider, getProgram, PROGRAM_ID } from "../../lib/solana";
import { useAuth } from "../../context/AuthContext";
import { saveCertificate, getAllCertificates, updateCertificateStatus } from "../../lib/certificateStore";
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

      doc.setDrawColor(180, 140, 60);
      doc.rect(15, 15, 6, 6);
      doc.rect(pageWidth - 21, 15, 6, 6);
      doc.rect(15, pageHeight - 21, 6, 6);
      doc.rect(pageWidth - 21, pageHeight - 21, 6, 6);

      doc.setFont("times", "bold");
      doc.setFontSize(24);
      doc.setTextColor(15, 23, 42);
      doc.text(instName, pageWidth / 2, 32, { align: "center" });

      doc.setFont("times", "italic");
      doc.setFontSize(11);
      doc.setTextColor(100, 116, 139);
      doc.text(
        "Upon the recommendation of the Academic Council and by the authority of the Board of Governors",
        pageWidth / 2,
        42,
        { align: "center" }
      );

      doc.setFont("times", "normal");
      doc.setFontSize(13);
      doc.setTextColor(71, 85, 105);
      doc.text("hereby confers upon", pageWidth / 2, 54, { align: "center" });

      doc.setFont("times", "bolditalic");
      doc.setFontSize(28);
      doc.setTextColor(16, 100, 70);
      doc.text(record.studentName, pageWidth / 2, 70, { align: "center" });

      doc.setFont("times", "normal");
      doc.setFontSize(12);
      doc.setTextColor(71, 85, 105);
      doc.text(`(Registration No: ${record.studentId})`, pageWidth / 2, 78, { align: "center" });

      doc.text("the degree of", pageWidth / 2, 90, { align: "center" });

      doc.setFont("times", "bold");
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42);
      doc.text(record.degree, pageWidth / 2, 104, { align: "center" });

      doc.setFont("times", "normal");
      doc.setFontSize(11);
      doc.setTextColor(51, 65, 85);
      doc.text(`with Cumulative Grade Point Average (CGPA) of ${record.cgpa} / 10.0`, pageWidth / 2, 114, { align: "center" });
      doc.text("along with all rights, privileges, and honors pertaining thereto.", pageWidth / 2, 122, { align: "center" });

      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(22, 138, 175, 24, 2, 2, "FD");

      doc.setFont("courier", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Unique Credential ID : ${record.id}`, 26, 145);
      doc.text(`SHA-256 Digest       : ${record.hash}`, 26, 151);
      doc.text(`Student Solana Key   : ${record.studentKey}`, 26, 157);

      doc.setFont("times", "normal");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);

      doc.line(30, 185, 85, 185);
      doc.text("Registrar of the University", 57.5, 191, { align: "center" });

      doc.line(pageWidth - 145, 185, pageWidth - 90, 185);
      doc.text("Dean / President", pageWidth - 117.5, 191, { align: "center" });

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Given on this day, ${formattedDate}`, pageWidth / 2, 172, { align: "center" });

      doc.addImage(qrDataUrl, "PNG", pageWidth - 65, 134, 42, 42);
      doc.setFontSize(7);
      doc.text("Scan to verify on Solana", pageWidth - 44, 180, { align: "center" });

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
      doc.text(instName, pageWidth / 2, 18, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text("OFFICE OF THE REGISTRAR - ACADEMIC CLEARANCE DIVISION", pageWidth / 2, 26, { align: "center" });

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(15, 45, pageWidth - 15, 45);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text(`REF NO: STU/MIG/${record.studentId}`, 15, 52);
      doc.text(`DATE: ${formattedDate}`, pageWidth - 15, 52, { align: "right" });

      doc.line(15, 56, pageWidth - 15, 56);

      doc.setFont("times", "bold");
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42);
      doc.text("MIGRATION CERTIFICATE", pageWidth / 2, 72, { align: "center" });

      doc.setFont("times", "normal");
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);

      const introText = `This is to certify that ${record.studentName}, student registered under Roll / ID No. ${record.studentId}, was a bona fide student of ${instName}.`;
      const splitIntro = doc.splitTextToSize(introText, pageWidth - 36);
      doc.text(splitIntro, 18, 90);

      const bodyText = `The University has No Objection to their continuing studies and transferring their academic admission to any other recognized University, College, or Post-Graduate Institution.`;
      const splitBody = doc.splitTextToSize(bodyText, pageWidth - 36);
      doc.text(splitBody, 18, 112);

      const clearanceText = `All institutional dues have been settled, and their academic conduct during their tenure has been satisfactory.`;
      const splitClearance = doc.splitTextToSize(clearanceText, pageWidth - 36);
      doc.text(splitClearance, 18, 130);

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(18, 146, pageWidth - 36, 40, 2, 2, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text("Student Name:", 24, 156);
      doc.text("Registration ID:", 24, 166);
      doc.text("Migration Status:", 24, 176);

      doc.setFont("helvetica", "normal");
      doc.text(record.studentName, 70, 156);
      doc.text(record.studentId, 70, 166);
      doc.setTextColor(16, 185, 129);
      doc.text("CLEARED & APPROVED", 70, 176);

      doc.addImage(qrDataUrl, "PNG", pageWidth - 62, 148, 36, 36);

      doc.setFont("courier", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Solana Anchor Hash : ${record.hash}`, 18, 202);
      doc.text(`Unique Credential  : ${record.id}`, 18, 208);

      doc.setFont("times", "normal");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);

      doc.setDrawColor(148, 163, 184);
      doc.line(pageWidth - 80, 245, pageWidth - 20, 245);
      doc.text("Authorized Registrar Signatory", pageWidth - 50, 252, { align: "center" });

      doc.setDrawColor(180, 140, 60);
      doc.setLineWidth(1);
      doc.circle(50, 240, 14);
      doc.setFontSize(7.5);
      doc.setTextColor(180, 140, 60);
      doc.text("OFFICIAL SEAL", 50, 241, { align: "center" });

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
    doc.text(instName, pageWidth / 2, 22, { align: "center" });

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");

    doc.text(`Document Type: ${record.docType}`, 20, 50);
    doc.text(`Student Name: ${record.studentName}`, 20, 62);
    doc.text(`Registration ID: ${record.studentId}`, 20, 74);
    doc.text(`Degree Program: ${record.degree}`, 20, 86);
    doc.text(`CGPA / Grade: ${record.cgpa}`, 20, 98);
    doc.text(`Issuance Date: ${formattedDate}`, 20, 110);
    doc.text(`Student Solana Key: ${record.studentKey}`, 20, 122);
    doc.text(`Unique Credential ID: ${record.id}`, 20, 134);

    doc.setFont("courier", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`SHA-256 Digest: ${record.hash}`, 20, 154);

    doc.addImage(qrDataUrl, "PNG", 130, 170, 55, 55);

    const filenamePrefix = record.docType.toLowerCase().replace(/\s+/g, "_");
    doc.save(`${filenamePrefix}_${record.studentId}.pdf`);
  };

  const handleRevoke = (certId, studentName) => {
    const reason = window.prompt(
      `Confirm Revocation of Certificate for ${studentName}?\nEnter reason for revocation (e.g. Academic Re-evaluation, Disciplinary, Incorrect Grade):`,
      "Academic Correction & Grade Update"
    );

    if (reason !== null) {
      const updated = updateCertificateStatus(certId, "REVOKED", reason);
      setIssuedHistory(updated);
      alert(`Certificate ${certId.slice(0, 8)}... has been flagged as REVOKED on the registry.`);
    }
  };

  const handleReissueSetup = (record) => {
    setFormData({
      institution: record.institution || user?.institution || "Solana Technical University",
      docType: record.docType,
      studentName: record.studentName,
      studentId: record.studentId,
      studentEmail: record.studentEmail || `${record.studentId.toLowerCase()}@student.edu`,
      studentPassword: "password123",
      degree: record.degree || "",
      cgpa: record.cgpa || "",
      studentKey: record.studentKey || "",
    });

    if (record.status !== "REVOKED") {
      updateCertificateStatus(record.id, "REVOKED", "Superseded by re-issuance");
    }

    setIssuedHistory(getAllCertificates());
    window.scrollTo({ top: 0, behavior: "smooth" });
    setStatus(`Loaded details for ${record.studentName}. Prior credential will be marked superseded upon new issuance.`);
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

      setStatus(`Generating verified ${formData.docType.toLowerCase()} PDF...`);
      await generatePDF(certRecord);

      setCreatedStudentNotice({
        email: formData.studentEmail.trim(),
        password: formData.studentPassword,
        id: credentialId,
      });

      setStatus(`Credential ${credentialId.slice(0, 8)}... successfully issued!`);
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
            The Issuer Portal is reserved for authorized University Registrar accounts.
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
    <div className="min-h-screen bg-[#050811] text-white flex flex-col items-center pt-8 px-4 pb-16">
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
                <label className="block text-xs text-gray-400 mb-1">Student Login Email</label>
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

          {createdStudentNotice && (
            <div className="p-3.5 bg-purple-950/60 border border-purple-700 text-purple-200 text-xs rounded-lg space-y-1">
              <p className="font-semibold text-emerald-400">Student Account Created Successfully:</p>
              <p>Email: <span className="font-mono text-white">{createdStudentNotice.email}</span></p>
              <p>Password: <span className="font-mono text-white">{createdStudentNotice.password}</span></p>
              <p>Unique Credential ID: <span className="font-mono text-emerald-300 break-all">{createdStudentNotice.id}</span></p>
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
                {loading ? "Processing..." : `Sign & Issue ${formData.docType}`}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* University Issuance Registry with Revoke / Reissue Actions */}
      <div className="w-full max-w-5xl bg-[#0c1322] border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-bold text-white">University Issuance Database</h2>
            <p className="text-xs text-slate-400">Manage, Revoke, or Reissue official student credentials</p>
          </div>
          <span className="bg-purple-950/60 border border-purple-800 text-purple-300 font-bold px-3.5 py-1 rounded-full text-xs">
            {issuedHistory.length} Total Records
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
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Document Type</th>
                  <th className="p-3">Credential ID</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Actions</th>
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
                    <td className="p-3 font-semibold text-white">
                      {item.studentName}
                      <span className="block text-[10px] text-slate-400 font-mono">{item.studentId}</span>
                    </td>
                    <td className="p-3 text-purple-300">{item.docType}</td>
                    <td className="p-3 font-mono text-[11px] text-slate-400">
                      {item.id.slice(0, 8)}...{item.id.slice(-6)}
                    </td>
                    <td className="p-3 text-slate-400">{new Date(item.timestamp * 1000).toLocaleDateString()}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => generatePDF(item)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded text-[11px] font-semibold transition"
                          title="Download PDF"
                        >
                          PDF
                        </button>
                        <button
                          onClick={() => handleReissueSetup(item)}
                          className="bg-purple-900/60 hover:bg-purple-800 border border-purple-700 text-purple-200 px-2 py-1 rounded text-[11px] font-semibold transition"
                          title="Reissue / Correct Credential"
                        >
                          Reissue
                        </button>
                        {item.status !== "REVOKED" && (
                          <button
                            onClick={() => handleRevoke(item.id, item.studentName)}
                            className="bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 px-2 py-1 rounded text-[11px] font-semibold transition"
                            title="Revoke Certificate"
                          >
                            Revoke
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
    </div>
  );
}