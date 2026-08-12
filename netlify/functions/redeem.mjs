import { getEnv, supabaseRpc } from "./_shared.mjs";
import { verifyTelegramInitData } from "./balance.mjs";

const REDEEM_POINTS = 100;

export const handler = async (event) => {
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  };

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "POST required" })
    };
  }

  try {
    const { TELEGRAM_BOT_TOKEN } = getEnv();

    const body = JSON.parse(event.body || "{}");
    const initData = body.initData;  
    const wallet_phone = String(body.wallet_phone || "").trim();
    if (!initData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing Telegram initData" })
      };
    }

    const user = verifyTelegramInitData(
      initData,
      TELEGRAM_BOT_TOKEN
    );

    const currentPoints = Number(
      await supabaseRpc(
        "get_or_create_user_points",
        {
          p_telegram_id: Number(user.id)
        }
      ) ?? 0
    );

    if (currentPoints < REDEEM_POINTS) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "رصيدك غير كافٍ للاستبدال",
          points: currentPoints,
          required: REDEEM_POINTS
        })
      };
    }

    const result = await supabaseRpc(
      "redeem_points",
      {
        p_telegram_id: Number(user.id),
        p_points: REDEEM_POINTS
      }
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        redeemed: REDEEM_POINTS,
        result
      })
    };

  } catch (error) {
    console.error(error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || "فشل طلب الاستبدال"
      })
    };
  }
};
