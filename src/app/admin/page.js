"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { getTrustedIssuers, updateIssuerStatus } from "../../lib/certificateStore";

export default function PlatformAdmin() {
  const { user } = useAuth();
  const [issuers, setIssuers] = useState([]);

  useEffect(() => {
    setIssuers(getTrustedIssuers());
  }, []);

  const handleStatusChange = (id, newStatus) => {
    const updated = updateIssuerStatus(id, newStatus);
    setIssuers(updated);
  };

  return (
    <div className="min-h-screen bg-[#050811] text-white flex flex-col items-center pt-8 px-4 pb-20">
      <div className="w-full max-w-4xl space-y-6">
        <div className="bg-[#0c1322] border border-slate-800 p-6 rounded-2xl flex justify-between items-center">
          <div>
            <span className="text-[11px] text-purple-400 font-mono uppercase tracking-wider">PLATFORM ADMIN (TRUST REGISTRY)</span>
            <h1 className="text-xl font-bold mt-1">Trusted Issuers Registry & Security Infrastructure</h1>
            <p className="text-xs text-slate-400">Oversee trusted educational institutions, public DIDs, and authority signatures.</p>
          </div>
          <span className="bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs px-3 py-1 rounded-full font-bold">
            {issuers.filter((i) => i.status === "VERIFIED").length} Active Issuers
          </span>
        </div>

        {/* Registry Table */}
        <div className="bg-[#0c1322] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-slate-800">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Trusted Issuer Identity Registry</h2>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-4">Institution</th>
                <th className="p-4">Issuer DID</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Administrative Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {issuers.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/30">
                  <td className="p-4 font-bold text-white">{item.name}</td>
                  <td className="p-4 font-mono text-purple-400 text-[11px]">{item.id}</td>
                  <td className="p-4">
                    {item.status === "VERIFIED" ? (
                      <span className="bg-emerald-950/80 border border-emerald-700 text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        • VERIFIED
                      </span>
                    ) : item.status === "PENDING" ? (
                      <span className="bg-amber-950/80 border border-amber-700 text-amber-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        • PENDING
                      </span>
                    ) : (
                      <span className="bg-red-950/80 border border-red-700 text-red-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        • SUSPENDED
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right space-x-2">
                    {item.status !== "VERIFIED" && (
                      <button
                        onClick={() => handleStatusChange(item.id, "VERIFIED")}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-lg text-xs font-semibold transition"
                      >
                        Approve & Verify
                      </button>
                    )}
                    {item.status !== "SUSPENDED" && (
                      <button
                        onClick={() => handleStatusChange(item.id, "SUSPENDED")}
                        className="bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 px-3 py-1 rounded-lg text-xs font-semibold transition"
                      >
                        Suspend
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}