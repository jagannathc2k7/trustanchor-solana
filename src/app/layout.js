import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import Navbar from "../components/Navbar";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-[#050811] text-slate-100 min-h-screen relative">
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