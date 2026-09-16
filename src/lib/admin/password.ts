import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * تجزئة كلمة مرور المسؤول — scrypt المدمجة في Node.js (لا حزمة خارجية
 * جديدة). ملح عشوائي لكل كلمة مرور، ومقارنة بزمن ثابت (timingSafeEqual)
 * لمنع هجمات قياس التوقيت. الصيغة المخزَّنة: "saltHex:derivedKeyHex".
 */

const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derivedKey = scryptSync(password, salt, KEY_LENGTH);
  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

export function verifyPasswordHash(password: string, stored: string): boolean {
  const [saltHex, keyHex] = stored.split(":");
  if (!saltHex || !keyHex) return false;

  const salt = Buffer.from(saltHex, "hex");
  const storedKey = Buffer.from(keyHex, "hex");
  const derivedKey = scryptSync(password, salt, KEY_LENGTH);

  return derivedKey.length === storedKey.length && timingSafeEqual(derivedKey, storedKey);
}
