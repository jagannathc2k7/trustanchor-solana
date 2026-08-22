import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import Navbar from "./Navbar";

export const metadata = {
  title: "TrustAnchor | Decentralized Academic Credentials",
  description: "Tamper-proof academic credential issuance, verification, and selective disclosure.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-[#050811] text-slate-100 min-h-screen relative selection:bg-purple-500 selection:text-white">
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[140px]" />
          <div className="absolute bottom-[-10%] right-[15%] w-[600px] h-[600px] bg-emerald-500/08 rounded-full blur-[160px]" />
        </div>

        <AuthProvider>
          <div className="relative z-10 flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}