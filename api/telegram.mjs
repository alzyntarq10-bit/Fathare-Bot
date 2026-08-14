export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true });
  }

  const update = req.body;
  const message = update?.message;

  if (!message?.chat?.id) {
    return res.status(200).json({ ok: true });
  }

  const chatId = message.chat.id;
  const text = message.text || "";

  if (text.startsWith("/start")) {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      return res.status(500).json({
        ok: false,
        error: "TELEGRAM_BOT_TOKEN is missing"
      });
    }

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: "🎁 أهلاً بك في Fathare Bot\n\nشاهد الإعلانات واجمع النقاط ثم استبدل نقاطك.",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🎁 شاهد الإعلان واربح نقاط",
                web_app: {
                  url: "https://sage-strudel-ec5210.netlify.app"
                }
              }
            ]
          ]
        }
      })
    });
  }

  return res.status(200).json({ ok: true });
}
