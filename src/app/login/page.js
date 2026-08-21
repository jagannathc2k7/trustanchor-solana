"use client";

import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const [role, setRole] = useState("university");
  const [username, setUsername] = useState("admin@university.edu");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setError("");
    if (newRole === "university") {
      setUsername("admin@university.edu");
      setPassword("password123");
    } else {
      setUsername("");
      setPassword("");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    const res = login(username, password, role);
    if (!res.success) {
      setError(res.error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] px-4">
      <div className="w-full max-w-md bg-[#0c1322] border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <h1 className="text-2xl font-bold text-white text-center mb-2">
          TrustAnchor Access Portal
        </h1>
        <p className="text-xs text-slate-400 text-center mb-6">
          Sign in to access authorized issuance & credential vault features
        </p>

        <div className="grid grid-cols-2 gap-2 bg-[#050811] p-1.5 rounded-xl mb-6 border border-slate-800">
          <button
            type="button"
            onClick={() => handleRoleChange("university")}
            className={`py-2 text-xs font-semibold rounded-lg transition ${
              role === "university"
                ? "bg-purple-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            University Admin
          </button>
          <button
            type="button"
            onClick={() => handleRoleChange("student")}
            className={`py-2 text-xs font-semibold rounded-lg transition ${
              role === "student"
                ? "bg-emerald-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Student Sign In
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {role === "university" ? "Institutional Email" : "Student Email"}
            </label>
            <input
              type="email"
              placeholder={role === "student" ? "e.g. student@domain.edu" : ""}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#050811] border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Password</label>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#050811] border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-950/50 border border-red-800 text-red-300 text-xs rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            className={`w-full py-3 text-white font-semibold rounded-lg text-sm transition ${
              role === "university"
                ? "bg-purple-600 hover:bg-purple-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            Sign In as {role === "university" ? "University Authority" : "Student"}
          </button>
        </form>
      </div>
    </div>
  );
}