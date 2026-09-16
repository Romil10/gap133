// Telegram broadcast layer for gap133. Posts to a public channel via a bot
// Romil creates with BotFather. No-ops cleanly when unconfigured, so the app
// runs fine before the bot exists.

const API = 'https://api.telegram.org';

export function telegramConfigured(): boolean {
  return !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHANNEL_ID);
}

export async function sendToChannel(text: string): Promise<boolean> {
  if (!telegramConfigured()) return false;
  try {
    const res = await fetch(
      `${API}/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHANNEL_ID,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(15_000),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}
