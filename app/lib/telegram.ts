// Telegram founder-notification helper. Fire-and-forget — failures are logged
// but never block the API response (lead capture must succeed even if Telegram
// is down). Used by auth-hook and invoice-create routes.
//
// Secrets live in .env (TELEGRAM_BOT_TOKEN, TELEGRAM_FOUNDER_CHAT_ID). Missing
// creds = ERROR log (operator should know Telegram is unconfigured for prod).

import * as Sentry from "@sentry/nextjs";

export async function notifyFounder(message: string): Promise<{ success: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_FOUNDER_CHAT_ID;

  if (!token || !chatId) {
    const err = "Telegram credentials missing (TELEGRAM_BOT_TOKEN or TELEGRAM_FOUNDER_CHAT_ID)";
    console.error("[telegram]", err);
    Sentry.captureException(new Error(err), {
      tags: { endpoint: "telegram", type: "config" },
      level: "error",
    });
    return { success: false, error: err };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      const err = `Telegram API error: ${response.status}`;
      console.error("[telegram]", err, text);
      Sentry.captureException(new Error(err), {
        tags: { endpoint: "telegram", status: response.status },
        extra: { responseText: text },
        level: "warning",
      });
      return { success: false, error: err };
    }

    return { success: true };
  } catch (err) {
    console.error("[telegram] Network error:", err);
    Sentry.captureException(err, {
      tags: { endpoint: "telegram", type: "network" },
      level: "error",
    });
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
