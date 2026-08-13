import { verifyTelegramInitData } from "./_shared.mjs";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { TELEGRAM_BOT_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } =
      process.env;

    if (!TELEGRAM_BOT_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        error: "إعدادات الخادم غير مكتملة"
      });
    }

    const initData = req.body?.initData;

    if (!initData) {
      return res.status(400).json({
        error: "بيانات Telegram غير موجودة"
      });
    }

    const user = verifyTelegramInitData(
      initData,
      TELEGRAM_BOT_TOKEN
    );

    const rpcResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/get_or_create_user_points`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          p_telegram_id: Number(user.id)
        })
      }
    );

    const data = await rpcResponse.json();

    if (!rpcResponse.ok) {
      throw new Error(data?.message || "فشل تحميل الرصيد");
    }

    const points = Number(
      Array.isArray(data) ? data[0]?.points ?? data[0] : data?.points ?? data
    ) || 0;

    return res.status(200).json({
      ok: true,
      points
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message || "فشل تحميل الرصيد"
    });
  }
}
