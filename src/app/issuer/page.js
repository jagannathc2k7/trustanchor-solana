"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import {
  fetchAllCertificates,
  saveCertificateToDb,
  updateCertificateInDb,
  deleteCertificateFromDb,
} from "../../lib/certificateStore";
import { sendIssuanceEmail } from "../../lib/emailService";

export default function IssuerPortal() {
  const [mounted, setMounted] = useState(false);
  const { user, loading: authLoading } = useAuth();

  const [formData, setFormData] = useState({
    institution: "VIT Chennai",
    docType: "OFFICIAL ACADEMIC TRANSCRIPT",
    studentName: "Alex Morgan",
    studentId: "CS-2026-8841",
    studentEmail: "alex.morgan@student.edu",
    studentPassword: "password123",
    degree: "Bachelor of Technology in Computer Science",
    cgpa: "3.92",
  });

  const [issuedHistory, setIssuedHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [editingRecord, setEditingRecord] = useState(null);
  const [inspectingRecord, setInspectingRecord] = useState(null);
  const [revokingRecord, setRevokingRecord] = useState(null);
  const [revokeReason, setRevokeReason] = useState("Academic Correction & Grade Discrepancy");

  const loadData = async () => {
    const data = await fetchAllCertificates();
    setIssuedHistory(data);
  };

  useEffect(() => {
    setMounted(true);
    loadData();
    if (user?.institution) {
      setFormData((prev) => ({ ...prev, institution: user.institution }));
    }
  }, [user]);

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingRecord) return;
    await updateCertificateInDb(editingRecord.id, editingRecord);
    await loadData();
    setEditingRecord(null);
  };

  const handleDelete = async (id) => {
    await deleteCertificateFromDb(id);
    await loadData();
  };

  const handleConfirmRevocation = async () => {
    if (!revokingRecord) return;
    await updateCertificateInDb(revokingRecord.id, {
      status: "REVOKED",
      revocationReason: revokeReason,
    });
    await loadData();
    setRevokingRecord(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setStatus("");
    setLoading(true);

    try {
      const credentialId = "cred_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      const now = Math.floor(Date.now() / 1000);

      const rawPayload = `${formData.institution}|${formData.docType}|${formData.studentName}|${formData.studentId}|${formData.degree}|${formData.cgpa}|${credentialId}|${now}`;
      const msgBuffer = new TextEncoder().encode(rawPayload);
      const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      setStatus("Anchoring record to verified database...");

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
        studentKey: "N/A",
        issuerAuthority: user?.username || "admin@vit.ac.in",
        timestamp: now,
      };

      await saveCertificateToDb(certRecord);
      await loadData();

      try {
        await sendIssuanceEmail({
          studentName: formData.studentName,
          studentEmail: formData.studentEmail.trim(),
          docType: formData.docType,
          institution: formData.institution.trim(),
          credentialId,
          studentPassword: formData.studentPassword,
          adminEmail: user?.username || "admin@vit.ac.in",
        });
      } catch (e) {
        console.warn("Email bypassed:", e);
      }

      setStatus(`Certificate issued & anchored successfully!`);
    } catch (err) {
      setErrorMsg(err.message || "Failed to issue certificate");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || authLoading) return null;

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
      <div className="w-full max-w-2xl bg-[#0f172a] border border-gray-800 rounded-2xl p-8 shadow-2xl mb-12">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Issuer Portal</h1>
            <p className="text-xs text-purple-400 font-medium mt-0.5">
              Logged in: {user.institution || formData.institution} ({user.name})
            </p>
          </div>
          <span className="bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs px-3 py-1 rounded-full font-bold">
            Authority Verified
          </span>
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
              Student Vault Credentials
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
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Saving to Database..." : `Store & Issue ${formData.docType}`}
            </button>
          </div>
        </form>
      </div>

      {/* Database Table */}
      <div className="w-full max-w-5xl bg-[#0c1322] border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-bold text-white">Academic Credentials Database</h2>
            <p className="text-xs text-slate-400">Live synchronized records across all client devices</p>
          </div>
          <span className="bg-purple-950/60 border border-purple-800 text-purple-300 font-bold px-3.5 py-1 rounded-full text-xs">
            {issuedHistory.length} Rows
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
                    <td className="p-3 font-semibold text-purple-300 max-w-[140px] truncate">{item.institution}</td>
                    <td className="p-3 font-semibold text-white">
                      {item.studentName}
                      <span className="block text-[10px] text-emerald-400 font-mono">{item.studentEmail}</span>
                    </td>
                    <td className="p-3 text-slate-300">{item.docType}</td>
                    <td className="p-3 font-mono text-[11px] text-slate-400">{item.id.slice(0, 8)}...{item.id.slice(-6)}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setInspectingRecord(item)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded text-[11px] font-semibold transition cursor-pointer"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingRecord({ ...item })}
                          className="bg-blue-950/80 hover:bg-blue-900 border border-blue-800 text-blue-300 px-2.5 py-1.5 rounded text-[11px] font-semibold transition cursor-pointer"
                        >
                          Edit
                        </button>
                        {item.status !== "REVOKED" ? (
                          <button
                            type="button"
                            onClick={() => {
                              setRevokingRecord(item);
                              setRevokeReason("Academic Correction & Grade Discrepancy");
                            }}
                            className="bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 px-2.5 py-1.5 rounded text-[11px] font-semibold transition cursor-pointer"
                          >
                            Revoke
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="bg-red-950/40 hover:bg-red-900 border border-red-900/60 text-red-400 px-2.5 py-1.5 rounded text-[11px] font-semibold transition cursor-pointer"
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

      {/* Edit Modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c1322] border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Edit Database Record</h3>
            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Student Name</label>
                <input
                  type="text"
                  value={editingRecord.studentName || ""}
                  onChange={(e) => setEditingRecord({ ...editingRecord, studentName: e.target.value })}
                  className="w-full bg-[#050811] border border-slate-700 rounded-lg p-2.5 text-white outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Institution Name</label>
                <input
                  type="text"
                  value={editingRecord.institution || ""}
                  onChange={(e) => setEditingRecord({ ...editingRecord, institution: e.target.value })}
                  className="w-full bg-[#050811] border border-slate-700 rounded-lg p-2.5 text-white outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Degree / Program</label>
                  <input
                    type="text"
                    value={editingRecord.degree || ""}
                    onChange={(e) => setEditingRecord({ ...editingRecord, degree: e.target.value })}
                    className="w-full bg-[#050811] border border-slate-700 rounded-lg p-2.5 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">CGPA</label>
                  <input
                    type="text"
                    value={editingRecord.cgpa || ""}
                    onChange={(e) => setEditingRecord({ ...editingRecord, cgpa: e.target.value })}
                    className="w-full bg-[#050811] border border-slate-700 rounded-lg p-2.5 text-white outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Status</label>
                <select
                  value={editingRecord.status || "VALID"}
                  onChange={(e) => setEditingRecord({ ...editingRecord, status: e.target.value })}
                  className="w-full bg-[#050811] border border-slate-700 rounded-lg p-2.5 text-white outline-none"
                >
                  <option value="VALID">VALID</option>
                  <option value="REVOKED">REVOKED</option>
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revocation Modal */}
      {revokingRecord && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c1322] border border-red-800/80 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-red-300">Revoke Certificate</h3>
            <p className="text-xs text-slate-300">
              Flagging credential for <span className="font-bold text-white">{revokingRecord.studentName}</span> as <span className="text-red-400 font-bold">REVOKED</span>.
            </p>
            <textarea
              rows="3"
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              className="w-full bg-[#050811] border border-slate-700 rounded-lg p-2.5 text-xs text-white outline-none"
            />
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRevokingRecord(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRevocation}
                className="flex-1 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Confirm Revocation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspector Modal */}
      {inspectingRecord && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c1322] border border-slate-800 rounded-2xl p-6 max-w-xl w-full shadow-2xl">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-white">Database Row Inspector</h3>
              <button
                type="button"
                onClick={() => setInspectingRecord(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            <pre className="bg-[#050811] p-4 rounded-xl border border-slate-800 text-[11px] text-emerald-400 font-mono overflow-auto max-h-80">
              {JSON.stringify(inspectingRecord, null, 2)}
            </pre>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectingRecord(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}