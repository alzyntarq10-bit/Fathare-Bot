export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(200).json({ ok: true });
  }

  const {
    TELEGRAM_BOT_TOKEN,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
  } = process.env;

  if (
    !TELEGRAM_BOT_TOKEN ||
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    return res.status(500).json({
      ok: false,
      error: "Missing environment variables"
    });
  }

  try {
    // جلب القروبات النشطة من Supabase
    const groupsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/telegram_groups?is_active=eq.true&select=chat_id,title`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );

    if (!groupsResponse.ok) {
      const error = await groupsResponse.text();

      return res.status(500).json({
        ok: false,
        error
      });
    }

    const groups = await groupsResponse.json();

    const message =
      "🎁 شاهد الإعلان واربح نقاط!\n\n" +
      "⭐ اجمع النقاط واستبدلها بالمكافآت.\n\n" +
      "👇 ابدأ الآن:\n" +
      "https://t.me/Fathare_bot";

    const results = [];

    // النشر في جميع القروبات المسجلة
    for (const group of groups) {
      try {
        const telegramResponse = await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              chat_id: group.chat_id,
              text: message,
              disable_web_page_preview: false
            })
          }
        );

        const telegramResult =
          await telegramResponse.json();

        results.push({
          chat_id: group.chat_id,
          title: group.title,
          sent: telegramResponse.ok,
          telegram: telegramResult
        });
      } catch (error) {
        results.push({
          chat_id: group.chat_id,
          title: group.title,
          sent: false,
          error: error.message
        });
      }
    }

    return res.status(200).json({
      ok: true,
      groups: groups.length,
      results
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
}
