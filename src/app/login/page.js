"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { login, matrixUsers, refreshMatrix } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("password123");
  const [activeRole, setActiveRole] = useState("student");
  const [errorMsg, setErrorMsg] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    refreshMatrix();
  }, []);

  const handleSelectPreset = (preset) => {
    setEmail(preset.username);
    setPassword(preset.password);
    setActiveRole(preset.role);
    
    // Auto-login and route to the corresponding portal
    login(preset.username, preset.password, preset.role);

    if (preset.role === "student") router.push("/student");
    else if (preset.role === "university") router.push("/issuer");
    else if (preset.role === "company") router.push("/company");
    else if (preset.role === "admin") router.push("/admin");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");
    const res = login(email, password, activeRole);
    if (res.success) {
      if (activeRole === "student") router.push("/student");
      else if (activeRole === "university") router.push("/issuer");
      else if (activeRole === "company") router.push("/company");
      else if (activeRole === "admin") router.push("/admin");
    } else {
      setErrorMsg("Authentication failed. Please check your credentials.");
    }
  };

  const filteredUsers = matrixUsers.filter((u) => {
    if (filter === "all") return true;
    return u.role === filter;
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        
        {/* LEFT: Dynamic Live Demo Matrix */}
        <div className="md:col-span-6 bg-[#0c1322]/90 border border-white/[0.08] rounded-2xl p-6 shadow-2xl backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest font-bold block">
                ⚡ DYNAMIC DEMO MATRIX
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {matrixUsers.length} Active Accounts
              </span>
            </div>
            
            <h2 className="text-xl font-black text-white tracking-tight">One-Click Role Authentication</h2>
            <p className="text-xs text-slate-400 mt-1 mb-4 leading-relaxed">
              Includes all student profiles issued dynamically in the ledger:
            </p>

            {/* Filter Tabs */}
            <div className="flex gap-1.5 mb-3 bg-[#050811] p-1 rounded-xl border border-slate-800 text-[11px]">
              {["all", "student", "university", "company", "admin"].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`flex-1 py-1 rounded-lg font-semibold uppercase transition cursor-pointer ${
                    filter === f
                      ? "bg-purple-600/30 border border-purple-500/40 text-white"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {f === "all" ? "All" : f}
                </button>
              ))}
            </div>

            {/* Scrollable list of accounts */}
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {filteredUsers.map((preset, idx) => (
                <button
                  key={preset.username + idx}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                    email === preset.username
                      ? "bg-purple-600/20 border-purple-500 text-white shadow-lg shadow-purple-500/10"
                      : "bg-[#050811] border-slate-800 hover:border-slate-700 text-slate-300"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full shrink-0 ${
                          preset.role === "student"
                            ? preset.status === "REVOKED"
                              ? "bg-red-400"
                              : "bg-emerald-400"
                            : preset.role === "university"
                            ? "bg-purple-400"
                            : preset.role === "company"
                            ? "bg-blue-400"
                            : "bg-amber-400"
                        }`}
                      />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-200 truncate">
                        {preset.role === "student" && `🎓 ${preset.name}`}
                        {preset.role === "university" && `🏛️ ${preset.institution || preset.name}`}
                        {preset.role === "company" && `💼 ${preset.company || preset.name}`}
                        {preset.role === "admin" && `🛡️ Platform Admin`}
                      </span>
                    </div>
                    <p className="text-[11px] text-purple-300 truncate mt-0.5 font-mono">{preset.username}</p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {preset.role === "student"
                        ? `${preset.studentId || "ID"} • ${preset.degree || "Degree Record"}`
                        : `Password: ${preset.password}`}
                    </p>
                  </div>
                  <span className="text-xs text-purple-400 font-bold opacity-0 group-hover:opacity-100 transition shrink-0">
                    Sign In ➔
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-white/[0.06] mt-3 text-[10px] text-slate-500 font-mono flex items-center justify-between">
            <span>SHA-256 Ledger Synchronized</span>
            <span className="text-emerald-400">● Live Cloud Database</span>
          </div>
        </div>

        {/* RIGHT: Standard Authentication Form */}
        <div className="md:col-span-6 bg-[#0c1322]/90 border border-white/[0.08] rounded-2xl p-8 shadow-2xl backdrop-blur-xl flex flex-col justify-center">
          <div className="mb-6">
            <h3 className="text-2xl font-black text-white">Sign In to TrustAnchor</h3>
            <p className="text-xs text-slate-400 mt-1">
              Target Role: <span className="text-purple-400 uppercase font-mono font-bold">{activeRole}</span>
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-xs">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold uppercase tracking-wider mb-1.5">
                Account Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@domain.com"
                className="w-full bg-[#050811] border border-slate-800 focus:border-purple-500 rounded-xl px-4 py-3 text-white text-xs outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#050811] border border-slate-800 focus:border-purple-500 rounded-xl px-4 py-3 text-white text-xs outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold uppercase tracking-wider mb-1.5">
                Role Context
              </label>
              <select
                value={activeRole}
                onChange={(e) => setActiveRole(e.target.value)}
                className="w-full bg-[#050811] border border-slate-800 focus:border-purple-500 rounded-xl px-4 py-3 text-white text-xs outline-none transition"
              >
                <option value="student">Student / Credential Holder</option>
                <option value="university">University Issuer Authority</option>
                <option value="company">Corporate Verifier / Recruiter</option>
                <option value="admin">Platform Trust Registry Admin</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-purple-600/20 cursor-pointer mt-2"
            >
              Sign In as {activeRole}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}