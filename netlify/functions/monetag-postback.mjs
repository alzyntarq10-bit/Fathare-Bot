import { getEnv, supabaseRpc } from "./_shared.mjs";

export default async (request) => {
  try {
    const url = new URL(request.url);

    const { MONETAG_POSTBACK_TOKEN } = getEnv();

    const token = url.searchParams.get("token");
    const telegramId = url.searchParams.get("telegram_id");
    const ymid = url.searchParams.get("ymid");
    const eventType = url.searchParams.get("event_type");
    const rewardEventType = url.searchParams.get("reward_event_type");
    const estimatedPrice =
      Number(url.searchParams.get("estimated_price") || 0);

    // التحقق من التوكن
    if (!MONETAG_POSTBACK_TOKEN || token !== MONETAG_POSTBACK_TOKEN) {
      return new Response("Unauthorized", { status: 401 });
    }

    // البيانات الأساسية المطلوبة
    if (!telegramId || !ymid) {
      return new Response("Missing telegram_id or ymid", {
        status: 400
      });
    }

    // لا نضيف نقاط إلا للإعلان المدفوع المؤكد
    if (rewardEventType !== "valued") {
      return new Response("Ignored", { status: 200 });
    }

    // إضافة 10 نقاط ومنع تكرار نفس YMID
    const newPoints = await supabaseRpc(
      "add_reward_points",
      {
        p_telegram_id: Number(telegramId),
        p_points: 10,
        p_ymid: ymid,
        p_event_type: eventType,
        p_estimated_price: estimatedPrice
      }
    );

    console.log("Monetag reward confirmed:", {
      telegramId,
      ymid,
      newPoints
    });

    return new Response(
      JSON.stringify({
        ok: true,
        points: Number(newPoints || 0)
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json"
        }
      }
    );

  } catch (error) {
    console.error(error);

    return new Response(
      JSON.stringify({
        error: error.message || "Server error"
      }),
      {
        status: 500,
        headers: {
          "content-type": "application/json"
        }
      }
    );
  }
};
