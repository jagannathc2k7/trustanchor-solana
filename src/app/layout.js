import "../styles/globals.css";
import SolanaProvider from "../components/SolanaProvider";
import Navbar from "../components/TempNavbar";
import { AuthProvider } from "../context/AuthContext";

export const metadata = {
  title: "TrustAnchor Solana | Decentralized Academic Ledger",
  description: "Tamper-proof academic transcript issuance & verification on Solana",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen bg-[#050811] text-slate-100 antialiased">
        <AuthProvider>
          <SolanaProvider>
            <Navbar />
            <main className="flex-1 max-w-5xl mx-auto w-full p-6">{children}</main>
          </SolanaProvider>
        </AuthProvider>
      </body>
    </html>
  );
}