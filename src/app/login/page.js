"use client";

import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
  const { login, PRESET_USERS } = useAuth();
  const [email, setEmail] = useState("student@vit.ac.in");
  const [password, setPassword] = useState("password123");
  const [activeRole, setActiveRole] = useState("student");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSelectPreset = (preset) => {
    setEmail(preset.username);
    setPassword(preset.password);
    setActiveRole(preset.role);
    // Instant autofill & login
    login(preset.username, preset.password, preset.role);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");
    const res = login(email, password, activeRole);
    if (!res.success) {
      setErrorMsg("Authentication failed. Please check credentials.");
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        
        {/* LEFT: Quick Access Matrix Demo Selector */}
        <div className="md:col-span-5 bg-[#0c1322]/90 border border-white/[0.08] rounded-2xl p-6 shadow-2xl backdrop-blur-xl flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest font-bold block mb-1">
              ⚡ LIVE DEMO MATRIX
            </span>
            <h2 className="text-xl font-black text-white tracking-tight">Student-Controlled Identity & Verification Layer</h2>
            <p className="text-xs text-slate-400 mt-1 mb-5 leading-relaxed">
              Select any role below to automatically authenticate and test specific feature permissions:
            </p>

            <div className="space-y-2.5">
              {PRESET_USERS?.map((preset) => (
                <button
                  key={preset.username}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                    email === preset.username
                      ? "bg-purple-600/20 border-purple-500 text-white shadow-lg shadow-purple-500/10"
                      : "bg-[#050811] border-slate-800 hover:border-slate-700 text-slate-300"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${
                        preset.role === "student" ? "bg-emerald-400" :
                        preset.role === "university" ? "bg-purple-400" :
                        preset.role === "company" ? "bg-blue-400" : "bg-amber-400"
                      }`} />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                        {preset.role === "student" && "🎓 Student / Holder"}
                        {preset.role === "university" && "🏛️ Issuer Institution"}
                        {preset.role === "company" && "💼 Company / Verifier"}
                        {preset.role === "admin" && "🛡️ Platform Admin"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-1 font-mono">{preset.username}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{preset.name || preset.institution || preset.company}</p>
                  </div>
                  <span className="text-xs text-purple-400 font-bold opacity-0 group-hover:opacity-100 transition shrink-0">
                    Switch ➔
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.06] mt-4 text-[10px] text-slate-500 font-mono flex items-center justify-between">
            <span>SHA-256 State Hashing</span>
            <span className="text-emerald-400">● Cloud Verified</span>
          </div>
        </div>

        {/* RIGHT: Standard Authentication Form */}
        <div className="md:col-span-7 bg-[#0c1322]/90 border border-white/[0.08] rounded-2xl p-8 shadow-2xl backdrop-blur-xl flex flex-col justify-center">
          <div className="mb-6">
            <h3 className="text-2xl font-black text-white">Sign In to TrustAnchor</h3>
            <p className="text-xs text-slate-400 mt-1">
              Role: <span className="text-purple-400 uppercase font-mono font-bold">{activeRole}</span>
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