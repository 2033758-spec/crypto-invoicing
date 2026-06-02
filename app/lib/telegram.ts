// Telegram founder-notification helper. Fire-and-forget — failures are logged
// but never block the API response (lead capture must succeed even if Telegram
// is down). Used by /api/lead route for waitlist + Pro tier interest leads.
//
// Secrets live in .env (TELEGRAM_BOT_TOKEN, TELEGRAM_FOUNDER_CHAT_ID). Missing
// creds = silent skip (e.g. local dev without bot configured).

export async function notifyFounder(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_FOUNDER_CHAT_ID;
  if (!token || !chatId) {
    console.warn("Telegram credentials missing — skipping notification");
    return;
  }
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
      }),
    });
  } catch (err) {
    console.error("Telegram notify failed:", err);
  }
}
