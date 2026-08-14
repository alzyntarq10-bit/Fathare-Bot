export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true });
  }

  const update = req.body;

  const {
    TELEGRAM_BOT_TOKEN,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
  } = process.env;

  const token = TELEGRAM_BOT_TOKEN;

  if (!token) {
    return res.status(500).json({
      ok: false,
      error: "TELEGRAM_BOT_TOKEN is missing"
    });
  }

  // =========================
  // تسجيل القروبات تلقائيًا
  // =========================
  async function saveGroup(chat) {
    if (
      !chat?.id ||
      !["group", "supergroup"].includes(chat.type) ||
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY
    ) {
      return;
    }

    try {
      await fetch(
        `${SUPABASE_URL}/rest/v1/telegram_groups?on_conflict=chat_id`,
        {
          method: "POST",
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates"
          },
          body: JSON.stringify({
            chat_id: Number(chat.id),
            title: chat.title || "Telegram Group",
            is_active: true
          })
        }
      );
    } catch (error) {
      console.error("Save group error:", error);
    }
  }

  // لو تم تغيير حالة البوت داخل قروب
  if (update?.my_chat_member?.chat) {
    const chat = update.my_chat_member.chat;
    const newStatus = update.my_chat_member?.new_chat_member?.status;

    if (["group", "supergroup"].includes(chat.type)) {
      if (
        ["member", "administrator"].includes(newStatus)
      ) {
        await saveGroup(chat);
      }

      if (
        ["left", "kicked"].includes(newStatus) &&
        SUPABASE_URL &&
        SUPABASE_SERVICE_ROLE_KEY
      ) {
        try {
          await fetch(
            `${SUPABASE_URL}/rest/v1/telegram_groups?chat_id=eq.${chat.id}`,
            {
              method: "PATCH",
              headers: {
                apikey: SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                is_active: false
              })
            }
          );
        } catch (error) {
          console.error(
            "Disable group error:",
            error
          );
        }
      }
    }

    return res.status(200).json({ ok: true });
  }

  // =========================
  // زر "رابط دعوتي"
  // =========================
  if (update?.callback_query) {
    const callback = update.callback_query;
    const callbackChatId =
      callback.message?.chat?.id;
    const callbackUserId =
      callback.from?.id;

    if (
      callback.data === "my_referral_link" &&
      callbackChatId &&
      callbackUserId
    ) {
      const referralLink =
        `https://t.me/Fathare_bot?start=ref_${callbackUserId}`;

      await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
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
        }
      );

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

  // =========================
  // استقبال الرسائل
  // =========================
  const message = update?.message;

  if (!message?.chat?.id) {
    return res.status(200).json({ ok: true });
  }

  const chatId = message.chat.id;
  const text = message.text || "";
  const userId = message.from?.id || chatId;

  // لو وصلت رسالة من قروب، خزّنه
  if (
    ["group", "supergroup"].includes(
      message.chat?.type
    )
  ) {
    await saveGroup(message.chat);
  }

  // =========================
  // أمر /start
  // =========================
  if (text.startsWith("/start")) {
    const parts =
      text.trim().split(/\s+/);

    const startParam =
      parts[1] || "";

    // =========================
    // معالجة رابط الإحالة
    // =========================
    if (startParam.startsWith("ref_")) {
      const referrerId =
        Number(
          startParam.replace("ref_", "")
        );

      if (
        Number.isFinite(referrerId) &&
        referrerId > 0 &&
        referrerId !== Number(userId)
      ) {
        if (
          SUPABASE_URL &&
          SUPABASE_SERVICE_ROLE_KEY
        ) {
          try {
            const referralResponse =
              await fetch(
                `${SUPABASE_URL}/rest/v1/rpc/reward_referral`,
                {
                  method: "POST",
                  headers: {
                    apikey:
                      SUPABASE_SERVICE_ROLE_KEY,
                    Authorization:
                      `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                    "Content-Type":
                      "application/json"
                  },
                  body: JSON.stringify({
                    p_referrer_id:
                      referrerId,
                    p_referred_id:
                      Number(userId),
                    p_points: 50
                  })
                }
              );

            if (referralResponse.ok) {
              const result =
                await referralResponse.json();

              const newBalance =
                Number(result);

              if (
                Number.isFinite(newBalance) &&
                newBalance !== -1
              ) {
                await fetch(
                  `https://api.telegram.org/bot${token}/sendMessage`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type":
                        "application/json"
                    },
                    body: JSON.stringify({
                      chat_id:
                        referrerId,
                      text:
                        "🎉 تمت دعوة صديق جديد بنجاح!\n\n" +
                        "⭐ تمت إضافة 50 نقطة إلى رصيدك.\n\n" +
                        `💰 رصيدك الحالي: ${newBalance} نقطة`
                    })
                  }
                );
              }
            } else {
              const referralError =
                await referralResponse.text();

              console.error(
                "Referral RPC failed:",
                referralError
              );
            }
          } catch (error) {
            console.error(
              "Referral error:",
              error
            );
          }
        }
      }
    }

    const referralLink =
      `https://t.me/Fathare_bot?start=ref_${userId}`;

    await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
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
                  text:
                    "🎁 شاهد الإعلان واربح نقاط",
                  web_app: {
                    url:
                      "https://sage-strudel-ec5210.netlify.app"
                  }
                }
              ],
              [
                {
                  text:
                    "👥 ادعُ صديقًا",
                  url:
                    "https://t.me/share/url?url=" +
                    encodeURIComponent(
                      referralLink
                    ) +
                    "&text=" +
                    encodeURIComponent(
                      "🎁 انضم إلى Fathare Bot وشاهد الإعلانات واجمع النقاط"
                    )
                }
              ],
              [
                {
                  text:
                    "🔗 رابط دعوتي",
                  callback_data:
                    "my_referral_link"
                }
              ]
            ]
          }
        })
      }
    );
  }

  return res.status(200).json({
    ok: true
  });
}
