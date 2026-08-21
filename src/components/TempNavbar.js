"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const [mounted, setMounted] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-6 py-4 flex justify-between items-center z-50 relative">
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-emerald-400" />
        <Link
          href={user ? "/" : "/login"}
          className="font-bold text-lg tracking-tight bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent"
        >
          TrustAnchor Solana
        </Link>
      </div>

      <div className="flex items-center gap-6">
        {/* Dynamic Navigation: Completely hidden if not logged in */}
        {mounted && user && (
          <nav className="flex gap-6 text-sm font-medium text-slate-300">
            <Link href="/" className="hover:text-emerald-400 transition">
              1-Click Verifier
            </Link>

            {user.role === "university" && (
              <Link href="/issuer" className="hover:text-emerald-400 transition">
                Issuer Portal
              </Link>
            )}

            {user.role === "student" && (
              <Link href="/student" className="hover:text-emerald-400 transition">
                Student Vault
              </Link>
            )}
          </nav>
        )}

        <div className="flex items-center gap-3">
          {mounted && user ? (
            <div className="flex items-center gap-3">
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                  user.role === "university"
                    ? "bg-purple-900/50 text-purple-300 border border-purple-700"
                    : "bg-emerald-900/50 text-emerald-300 border border-emerald-700"
                }`}
              >
                {user.name} ({user.role === "university" ? "Univ" : "Student"})
              </span>
              <button
                onClick={logout}
                className="text-xs text-red-400 hover:text-red-300 font-semibold"
              >
                Logout
              </button>
            </div>
          ) : (
            mounted && (
              <Link
                href="/login"
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-lg font-semibold transition"
              >
                Sign In
              </Link>
            )
          )}

          {mounted && (
            <div className="min-w-[140px] flex justify-end">
              <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 !h-9 !px-4 !rounded-lg !text-sm !font-semibold" />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}