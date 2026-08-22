"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const {
    login,
    deviceHistory,
    allDbUsers,
    isDevMode,
    toggleDevDevice,
    clearDeviceHistory,
    refreshGlobal,
  } = useAuth();

  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("password123");
  const [activeRole, setActiveRole] = useState("student");
  const [errorMsg, setErrorMsg] = useState("");
  const [showDevModal, setShowDevModal] = useState(false);
  const [devCodeInput, setDevCodeInput] = useState("");

  useEffect(() => {
    refreshGlobal();
  }, []);

  const handleSelectAccount = (acc) => {
    setEmail(acc.username);
    setPassword(acc.password || "password123");
    setActiveRole(acc.role);

    login(acc.username, acc.password || "password123", acc.role);

    if (acc.role === "student") router.push("/student");
    else if (acc.role === "university") router.push("/issuer");
    else if (acc.role === "company") router.push("/company");
    else if (acc.role === "admin") router.push("/admin");
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
      setErrorMsg("Authentication failed. Please check credentials.");
    }
  };

  const handleDevUnlock = (e) => {
    e.preventDefault();
    if (devCodeInput === "admin2026" || devCodeInput === "developer") {
      toggleDevDevice(true);
      setShowDevModal(false);
      setDevCodeInput("");
    } else {
      alert("Invalid developer master key.");
    }
  };

  // Accounts visible to this device:
  // If Developer Device -> Show all database users
  // If Normal User Device -> Only show accounts that have logged into THIS device previously
  const displayAccounts = isDevMode ? allDbUsers : deviceHistory;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        
        {/* LEFT: Device-Specific Account Matrix */}
        <div className="md:col-span-6 bg-[#0c1322]/90 border border-white/[0.08] rounded-2xl p-6 shadow-2xl backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-mono uppercase tracking-widest font-bold block text-purple-400">
                {isDevMode ? "⚡ DEV DEVICE (FULL MATRIX)" : "📱 LOCAL DEVICE SESSIONS"}
              </span>
              {isDevMode ? (
                <button
                  onClick={() => toggleDevDevice(false)}
                  className="text-[10px] text-red-400 hover:underline font-mono"
                >
                  Exit Dev Mode
                </button>
              ) : (
                <button
                  onClick={() => setShowDevModal(true)}
                  className="text-[10px] text-slate-500 hover:text-purple-400 font-mono"
                >
                  ⚙ Developer Unlock
                </button>
              )}
            </div>

            <h2 className="text-xl font-black text-white tracking-tight">
              {isDevMode ? "Master Developer Monitor" : "Saved Logins on this Device"}
            </h2>
            <p className="text-xs text-slate-400 mt-1 mb-4 leading-relaxed">
              {isDevMode
                ? "This device is authorized as a Developer Station. All ledger accounts are accessible."
                : "Only accounts authenticated on this specific browser session are remembered here."}
            </p>

            {displayAccounts.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl bg-[#050811]/50 my-6">
                <span className="text-2xl block mb-2">🔒</span>
                <p className="text-xs text-slate-300 font-semibold">No saved sessions on this device.</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Sign in on the right to register your account credentials on this device.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {displayAccounts.map((acc, idx) => (
                  <button
                    key={acc.username + idx}
                    type="button"
                    onClick={() => handleSelectAccount(acc)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                      email === acc.username
                        ? "bg-purple-600/20 border-purple-500 text-white shadow-lg shadow-purple-500/10"
                        : "bg-[#050811] border-slate-800 hover:border-slate-700 text-slate-300"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full shrink-0 ${
                            acc.role === "student"
                              ? "bg-emerald-400"
                              : acc.role === "university"
                              ? "bg-purple-400"
                              : acc.role === "company"
                              ? "bg-blue-400"
                              : "bg-amber-400"
                          }`}
                        />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-200 truncate">
                          {acc.role === "student" && `🎓 ${acc.name || "Student"}`}
                          {acc.role === "university" && `🏛️ ${acc.institution || acc.name || "University"}`}
                          {acc.role === "company" && `💼 ${acc.company || acc.name || "Company"}`}
                          {acc.role === "admin" && `🛡️ Admin`}
                        </span>
                      </div>
                      <p className="text-[11px] text-purple-300 truncate mt-0.5 font-mono">{acc.username}</p>
                    </div>
                    <span className="text-xs text-purple-400 font-bold opacity-0 group-hover:opacity-100 transition shrink-0">
                      Sign In ➔
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-white/[0.06] mt-3 text-[10px] text-slate-500 font-mono flex items-center justify-between">
            <span>{isDevMode ? "All Ledger Profiles" : "Device-Restricted Sandbox"}</span>
            {!isDevMode && deviceHistory.length > 0 && (
              <button onClick={clearDeviceHistory} className="text-red-400 hover:underline">
                Clear Local History
              </button>
            )}
          </div>
        </div>

        {/* RIGHT: Standard Manual Authentication Form */}
        <div className="md:col-span-6 bg-[#0c1322]/90 border border-white/[0.08] rounded-2xl p-8 shadow-2xl backdrop-blur-xl flex flex-col justify-center">
          <div className="mb-6">
            <h3 className="text-2xl font-black text-white">Sign In to TrustAnchor</h3>
            <p className="text-xs text-slate-400 mt-1">
              Signing in as: <span className="text-purple-400 uppercase font-mono font-bold">{activeRole}</span>
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
              Sign In & Save to This Device
            </button>
          </form>
        </div>

      </div>

      {/* Developer Device Unlock Modal */}
      {showDevModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c1322] border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white">Authorize Developer Station</h3>
            <p className="text-xs text-slate-400">
              Enter the developer master key to enable global monitoring on this device:
            </p>
            <form onSubmit={handleDevUnlock} className="space-y-3">
              <input
                type="password"
                placeholder="Enter passcode (admin2026)"
                value={devCodeInput}
                onChange={(e) => setDevCodeInput(e.target.value)}
                className="w-full bg-[#050811] border border-slate-700 rounded-lg p-2.5 text-xs text-white outline-none"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDevModal(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg font-semibold"
                >
                  Unlock All
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}