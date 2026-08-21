import emailjs from "@emailjs/browser";

export async function sendIssuanceEmail({
  studentName,
  studentEmail,
  docType,
  institution,
  credentialId,
  studentPassword,
  adminEmail,
}) {
  const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
  const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

  const emailBody = `Dear ${studentName},

Your official ${docType} has been successfully signed and anchored to the Solana decentralized academic ledger by ${institution}.

--- CREDENTIAL ACCESS DETAILS ---
• Issuing Authority : ${institution} (${adminEmail})
• Document Type     : ${docType}
• Credential ID     : ${credentialId}

--- YOUR STUDENT VAULT LOGIN ---
• Portal URL        : ${typeof window !== "undefined" ? window.location.origin : "https://trustanchor.vercel.app"}/login
• Login Email       : ${studentEmail}
• Temporary Password: ${studentPassword}

You can log in to your Student Vault to download your official sealed PDF, view your credential on Solana, or share your verification pass with employers.

Sincerely,
Office of the Registrar
${institution}`;

  if (serviceId && templateId && publicKey) {
    try {
      const response = await emailjs.send(
        serviceId,
        templateId,
        {
          to_name: studentName,
          to_email: studentEmail,
          from_name: `${institution} Registrar Office`,
          from_email: adminEmail,
          doc_type: docType,
          credential_id: credentialId,
          temporary_password: studentPassword,
          message: emailBody,
        },
        publicKey
      );
      return { success: true, mode: "api", response };
    } catch (err) {
      console.warn("EmailJS API send failed, using client dispatch:", err);
    }
  }

  // Fallback: Open system mail client with prefilled body
  const subject = encodeURIComponent(`[CONFIRMED] Your Official ${docType} Has Been Issued`);
  const encodedBody = encodeURIComponent(emailBody);
  const mailtoLink = `mailto:${studentEmail}?subject=${subject}&body=${encodedBody}`;

  return { success: true, mode: "client", mailtoLink, body: emailBody };
}