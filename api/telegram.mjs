export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true });
  }

  const update = req.body;
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return res.status(500).json({
      ok: false,
      error: "TELEGRAM_BOT_TOKEN is missing"
    });
  }

  // زر "رابط دعوتي"
  if (update?.callback_query) {
    const callback = update.callback_query;
    const callbackChatId = callback.message?.chat?.id;
    const callbackUserId = callback.from?.id;

    if (
      callback.data === "my_referral_link" &&
      callbackChatId &&
      callbackUserId
    ) {
      const referralLink =
        `https://t.me/Fathare_bot?start=ref_${callbackUserId}`;

      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: callbackChatId,
          text:
            "🔗 رابط دعوتك الخاص:\n\n" +
            referralLink +
            "\n\nأرسله لأصدقائك."
        })
      });

      await fetch(
        `https://api.telegram.org/bot${token}/answerCallbackQuery`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            callback_query_id: callback.id
          })
        }
      );
    }

    return res.status(200).json({ ok: true });
  }

  const message = update?.message;

  if (!message?.chat?.id) {
    return res.status(200).json({ ok: true });
  }

  const chatId = message.chat.id;
  const text = message.text || "";
  const userId = message.from?.id || chatId;

  if (text.startsWith("/start")) {
   const parts = text.trim().split(/\s+/);
const startParam = parts[1] || "";

if (startParam.startsWith("ref_")) {
  const referrerId = Number(startParam.replace("ref_", ""));

  if (
    Number.isFinite(referrerId) &&
    referrerId > 0 &&
    referrerId !== Number(userId)
  ) {
    const {
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    } = process.env;

    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      await fetch(
        `${SUPABASE_URL}/rest/v1/rpc/reward_referral`,
        {
          method: "POST",
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            p_referrer_id: referrerId,
            p_referred_id: Number(userId),
            p_points: 50
          })
        }
      );
    }
  }
} 
    const referralLink =
      `https://t.me/Fathare_bot?start=ref_${userId}`;

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: chatId,
        text:
          "🎁 أهلاً بك في Fathare Bot\n\n" +
          "شاهد الإعلانات واجمع النقاط ثم استبدل نقاطك.\n\n" +
          "👥 يمكنك أيضًا دعوة أصدقائك من زر الدعوة.",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🎁 شاهد الإعلان واربح نقاط",
                web_app: {
                  url: "https://sage-strudel-ec5210.netlify.app"
                }
              }
            ],
            [
              {
                text: "👥 ادعُ صديقًا",
                url:
                  "https://t.me/share/url?url=" +
                  encodeURIComponent(referralLink) +
                  "&text=" +
                  encodeURIComponent(
                    "🎁 انضم إلى Fathare Bot وشاهد الإعلانات واجمع النقاط"
                  )
              }
            ],
            [
              {
                text: "🔗 رابط دعوتي",
                callback_data: "my_referral_link"
              }
            ]
          ]
        }
      })
    });
  }

  return res.status(200).json({ ok: true });
}
