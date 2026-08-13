import crypto from "node:crypto";

export function verifyTelegramInitData(initData, botToken) {
  if (!initData || !botToken) {
    throw new Error("بيانات Telegram غير مكتملة");
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");

  if (!hash) {
    throw new Error("Telegram hash غير موجود");
  }

  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (
    calculatedHash.length !== hash.length ||
    !crypto.timingSafeEqual(
      Buffer.from(calculatedHash, "hex"),
      Buffer.from(hash, "hex")
    )
  ) {
    throw new Error("فشل التحقق من Telegram");
  }

  const userRaw = params.get("user");

  if (!userRaw) {
    throw new Error("بيانات المستخدم غير موجودة");
  }

  return JSON.parse(userRaw);
}

export function jsonResponse(statusCode, data) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify(data)
  };م
}
