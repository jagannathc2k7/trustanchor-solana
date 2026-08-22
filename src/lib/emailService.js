export async function sendIssuanceEmail(data) {
  try {
    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (err) {
    console.error("Failed to trigger email API:", err);
    return { success: false, error: err.message };
  }
}