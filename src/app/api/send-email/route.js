import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req) {
  try {
    const { studentName, studentEmail, docType, institution, credentialId, studentPassword } = await req.json();

    if (!studentEmail) {
      return NextResponse.json({ error: "Student email is required." }, { status: 400 });
    }

    // Configured via environment variables (e.g., Gmail, Resend SMTP, or SendGrid)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const loginUrl = process.env.NEXT_PUBLIC_APP_URL || "https://trustanchor.vercel.app/login";

    const mailOptions = {
      from: `"${institution} Registrar" <${process.env.SMTP_USER || "noreply@trustanchor.dev"}>`,
      to: studentEmail,
      subject: `Official Academic Credential Issued: ${docType}`,
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #0c1322; color: #f8fafc; padding: 30px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
          <h2 style="color: #a855f7; margin-top: 0;">${institution}</h2>
          <p style="font-size: 16px; color: #e2e8f0;">Dear <strong>${studentName}</strong>,</p>
          <p style="font-size: 14px; color: #94a3b8; line-height: 1.6;">
            Your official <strong>${docType}</strong> has been signed, cryptographically anchored, and registered in your student vault.
          </p>
          
          <div style="background-color: #050811; border: 1px solid #334155; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;"><strong>Credential ID:</strong> <span style="color: #38bdf8; font-family: monospace;">${credentialId}</span></p>
            <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;"><strong>Vault Email:</strong> <span style="color: #34d399;">${studentEmail}</span></p>
            <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;"><strong>Temporary Password:</strong> <span style="color: #fbbf24; font-family: monospace;">${studentPassword || "password123"}</span></p>
          </div>

          <p style="font-size: 14px; color: #94a3b8;">
            You can now view your grades, generate PDF transcripts, and create selective disclosure proofs for recruiters:
          </p>

          <a href="${loginUrl}" style="display: inline-block; background-color: #9333ea; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; margin-top: 10px;">
            Access Student Vault
          </a>

          <p style="font-size: 11px; color: #64748b; margin-top: 30px; border-top: 1px solid #1e293b; padding-top: 15px;">
            This is an automated notification from TrustAnchor Verified Credentials Ledger.
          </p>
        </div>
      `,
    };

    // If SMTP credentials aren't set in environment, log simulation gracefully
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn("SMTP credentials not configured. Simulated email dispatch to:", studentEmail);
      return NextResponse.json({ success: true, simulated: true });
    }

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Email send error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}