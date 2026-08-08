export default async (request) => {
  try {
    const url = new URL(request.url);

    const telegramId =
      url.searchParams.get("telegram_id") ||
      url.searchParams.get("subid");

    const reward = Number(url.searchParams.get("reward") || 10);

    if (!telegramId) {
      return new Response("Missing telegram_id", { status: 400 });
    }

    // هنا سيتم لاحقًا ربط Supabase
    // لإضافة النقاط إلى حساب المستخدم بعد تأكيد Monetag.

    console.log("Monetag reward:", {
      telegramId,
      reward
    });

    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error(error);

    return new Response("Server error", {
      status: 500
    });
  }
};
