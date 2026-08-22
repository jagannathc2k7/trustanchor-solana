"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navLinks = [
    { name: "Verifier", href: "/" },
    { name: "Student Vault", href: "/student" },
    { name: "Issuer Portal", href: "/issuer" },
    { name: "Company Engine", href: "/company" },
    { name: "Trust Registry", href: "/admin" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.06] bg-[#050811]/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-emerald-400 p-[1px] shadow-lg shadow-purple-500/20">
            <div className="h-full w-full bg-[#050811] rounded-[11px] flex items-center justify-center">
              <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-emerald-400 text-sm">
                TA
              </span>
            </div>
          </div>
          <div className="leading-tight">
            <span className="font-extrabold text-sm tracking-tight text-white block">TrustAnchor</span>
            <span className="text-[10px] font-mono text-purple-400 block tracking-widest uppercase">Verified Ledger</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1 bg-[#0c1322]/80 border border-white/[0.06] p-1 rounded-xl">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-purple-600/20 border border-purple-500/30 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5">
          {user ? (
            <div className="flex items-center gap-2 bg-[#0c1322] border border-white/[0.06] px-3 py-1.5 rounded-xl">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <div className="text-left">
                <p className="text-xs font-bold text-slate-200 truncate max-w-[120px]">{user.name}</p>
                <p className="text-[9px] text-purple-400 font-mono uppercase">{user.role}</p>
              </div>
              <button
                onClick={logout}
                className="ml-2 text-slate-500 hover:text-red-400 text-xs font-semibold cursor-pointer"
                title="Log Out"
              >
                ✕
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}