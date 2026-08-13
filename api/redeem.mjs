import { verifyTelegramInitData } from "./_shared.mjs";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
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
        error: "إعدادات الخادم غير مكتملة"
      });
    }

    const initData = req.body?.initData;
    const walletPhone = String(req.body?.wallet_phone || "").trim();

    if (!initData) {
      return res.status(400).json({
        error: "بيانات Telegram غير موجودة"
      });
    }

    if (!walletPhone) {
      return res.status(400).json({
        error: "رقم المحفظة مطلوب"
      });
    }

    const user = verifyTelegramInitData(
      initData,
      TELEGRAM_BOT_TOKEN
    );

    const rpcResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/redeem_points`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          p_telegram_id: Number(user.id),
          p_wallet_phone: walletPhone,
          p_points: 100
        })
      }
    );

    const data = await rpcResponse.json();

    if (!rpcResponse.ok) {
      throw new Error(
        data?.message ||
        data?.error ||
        "فشل استبدال النقاط"
      );
    }

    const result = Array.isArray(data) ? data[0] : data;

    return res.status(200).json({
      ok: true,
      points: Number(result?.points ?? result?.balance ?? 0),
      message: "تم إرسال طلب الاستبدال بنجاح"
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message || "فشل استبدال النقاط"
    });
  }
}
