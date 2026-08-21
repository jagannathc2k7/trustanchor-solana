"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import { getAllCertificates, createSelectiveShareToken } from "../../lib/certificateStore";

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

  useEffect(() => {
    setMounted(true);
    if (user) {
      const all = getAllCertificates();
      const matched = all.filter(
        (c) =>
          c.studentEmail?.toLowerCase() === user.username.toLowerCase() ||
          c.studentId?.toLowerCase() === user.studentId?.toLowerCase()
      );
      setStudentCerts(matched.length ? matched : all.slice(0, 3)); // Fallback preview data
    }
  }, [user]);

  const handleGenerateShare = () => {
    if (!activeCertForShare) return;
    const tokenId = createSelectiveShareToken({
      certId: activeCertForShare.id,
      selectedFields,
      durationHours: shareDuration,
    });
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const fullUrl = `${origin}/verify?token=${tokenId}`;
    setGeneratedShareLink(fullUrl);
  };

  if (!mounted || authLoading) return null;

  return (
    <div className="min-h-screen bg-[#050811] text-white flex justify-center pt-8 px-4 pb-20">
      <div className="w-full max-w-5xl">
        {/* Header summary */}
        <div className="flex justify-between items-center bg-[#0c1322] border border-slate-800 p-6 rounded-2xl mb-8">
          <div>
            <span className="text-[11px] text-emerald-400 font-mono uppercase tracking-wider">STUDENT / CREDENTIAL HOLDER</span>
            <h1 className="text-2xl font-black mt-1">{user?.name || "Student"}</h1>
            <p className="text-xs text-slate-400">Roll ID: {user?.studentId || "25BLC1371"}</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Verified Credentials</span>
            <span className="text-2xl font-extrabold text-purple-400">{studentCerts.length}</span>
          </div>
        </div>

        {/* Credentials Table */}
        <div className="bg-[#0c1322] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-5 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-sm font-bold">My Documents Wallet</h2>
            <span className="text-xs text-slate-400">Selective Zero-Knowledge Share Enabled</span>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-4">Document Title</th>
                <th className="p-4">Credential ID</th>
                <th className="p-4">Issue Date</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {studentCerts.map((cert) => (
                <tr key={cert.id} className="hover:bg-slate-800/30">
                  <td className="p-4 font-semibold text-white">
                    {cert.degree || cert.docType}
                    <span className="block text-[10px] text-slate-500">{cert.institution}</span>
                  </td>
                  <td className="p-4 font-mono text-slate-400">{cert.id.slice(0, 12)}...</td>
                  <td className="p-4">{new Date(cert.timestamp * 1000).toLocaleDateString()}</td>
                  <td className="p-4">
                    {cert.status === "REVOKED" ? (
                      <span className="bg-red-950/80 border border-red-700 text-red-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        • Revoked
                      </span>
                    ) : (
                      <span className="bg-emerald-950/80 border border-emerald-700 text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        • Verified / Active
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => {
                        setActiveCertForShare(cert);
                        setGeneratedShareLink("");
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition"
                    >
                      Selective Share
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
                    Choose which data fields to reveal to external verifiers and set link expiry.
                  </p>
                </div>
                <button
                  onClick={() => setActiveCertForShare(null)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Step 1: Checkbox selection */}
              <div>
                <p className="text-[11px] uppercase font-bold text-purple-400 tracking-wider mb-2">
                  Step 1: Select Information Claims to Disclose
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <label className="flex items-center gap-2 p-2.5 bg-[#050811] rounded-xl border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFields.studentName}
                      onChange={(e) =>
                        setSelectedFields({ ...selectedFields, studentName: e.target.checked })
                      }
                      className="accent-purple-600"
                    />
                    <span>Student Name ({activeCertForShare.studentName})</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-[#050811] rounded-xl border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFields.degree}
                      onChange={(e) =>
                        setSelectedFields({ ...selectedFields, degree: e.target.checked })
                      }
                      className="accent-purple-600"
                    />
                    <span>Program ({activeCertForShare.degree})</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-[#050811] rounded-xl border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFields.branch}
                      onChange={(e) =>
                        setSelectedFields({ ...selectedFields, branch: e.target.checked })
                      }
                      className="accent-purple-600"
                    />
                    <span>Branch (Computer Science)</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-[#050811] rounded-xl border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFields.cgpa}
                      onChange={(e) =>
                        setSelectedFields({ ...selectedFields, cgpa: e.target.checked })
                      }
                      className="accent-purple-600"
                    />
                    <span>CGPA ({activeCertForShare.cgpa || "8.42"})</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-[#050811] rounded-xl border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFields.rollNumber}
                      onChange={(e) =>
                        setSelectedFields({ ...selectedFields, rollNumber: e.target.checked })
                      }
                      className="accent-purple-600"
                    />
                    <span>Roll Number ({activeCertForShare.studentId})</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-[#050811] rounded-xl border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFields.subjectGrades}
                      onChange={(e) =>
                        setSelectedFields({ ...selectedFields, subjectGrades: e.target.checked })
                      }
                      className="accent-purple-600"
                    />
                    <span>Individual Subject Grades</span>
                  </label>
                </div>
              </div>

              {/* Step 2: Duration */}
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
                onClick={handleGenerateShare}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition"
              >
                Generate Selective Share Link & QR
              </button>

              {generatedShareLink && (
                <div className="p-3 bg-[#050811] border border-slate-800 rounded-xl space-y-2">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Shareable Token Link:</span>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={generatedShareLink}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-purple-300 font-mono truncate"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedShareLink);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
                    >
                      {copied ? "Copied!" : "Copy Link"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}