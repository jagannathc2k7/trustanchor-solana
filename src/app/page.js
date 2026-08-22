"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Forward any query params (e.g., ?token=share_xxx) to /login
    const search = window.location.search;
    router.replace(`/login${search}`);
  }, [router]);

  return (
    <div className="min-h-screen bg-[#050811] flex items-center justify-center text-xs text-slate-500 font-mono">
      Redirecting to Access Portal...
    </div>
  );
}