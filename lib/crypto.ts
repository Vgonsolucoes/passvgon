import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "node:crypto";

const ALGO = "aes-256-gcm";
const KEY_LEN = 32; // 256 bits
const NONCE_LEN = 12; // 96 bits recomendado GCM
const TAG_LEN = 16; // 128 bits

export type EncryptedBlob = {
  nonce: Uint8Array;
  tag: Uint8Array;
  ciphertext: Uint8Array;
};

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "[PassVGON] ENCRYPTION_KEY não configurada. Variável obrigatória para criptografia dos segredos do cofre."
    );
  }
  const hex = raw.trim();
  if (!/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error(
      "[PassVGON] ENCRYPTION_KEY deve ser uma string hexadecimal com pelo menos 64 caracteres (AES-256)."
    );
  }
  const bytes = Buffer.from(hex, "hex");
  if (bytes.length < KEY_LEN) {
    throw new Error(
      `[PassVGON] ENCRYPTION_KEY muito curta. Requer ${KEY_LEN} bytes (64 hex chars); encontrou ${bytes.length} bytes.`
    );
  }
  return bytes.subarray(0, KEY_LEN);
}

export function encryptSecret(plaintext: string): string {
  if (plaintext == null) {
    return "";
  }
  const key = getKey();
  const nonce = randomBytes(NONCE_LEN);
  const cipher = createCipheriv(ALGO, key, nonce);
  const c1 = cipher.update(plaintext, "utf8");
  const c2 = cipher.final();
  const ciphertext = Buffer.concat([c1, c2]);
  const tag = cipher.getAuthTag();
  const out = Buffer.concat([nonce, tag, ciphertext]);
  return out.toString("base64");
}

export function decryptSecret(b64: string | null | undefined): string | null {
  if (!b64) return null;
  let buf: Buffer;
  try {
    buf = Buffer.from(b64, "base64");
  } catch {
    return null;
  }
  const MIN = NONCE_LEN + TAG_LEN;
  if (buf.length < MIN) return null;
  const nonce = buf.subarray(0, NONCE_LEN);
  const tag = buf.subarray(NONCE_LEN, NONCE_LEN + TAG_LEN);
  const ciphertext = buf.subarray(NONCE_LEN + TAG_LEN);
  const key = getKey();
  try {
    const decipher = createDecipheriv(ALGO, key, nonce);
    decipher.setAuthTag(tag);
    const p1 = decipher.update(ciphertext);
    const p2 = decipher.final();
    return Buffer.concat([p1, p2]).toString("utf8");
  } catch {
    return null;
  }
}

export function constantTimeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) {
    timingSafeEqual(Buffer.alloc(ba.length), Buffer.alloc(ba.length));
    return false;
  }
  return timingSafeEqual(ba, bb);
}

export function generateSecurePassword(
  length = 20,
  opts?: { uppercase?: boolean; lowercase?: boolean; numbers?: boolean; symbols?: boolean }
): string {
  const u = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const l = "abcdefghijkmnpqrstuvwxyz";
  const n = "23456789";
  const s = "!@#$%^&*()-_=+[]{};:,.<>/?";
  const config = {
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    ...(opts ?? {})
  };
  let chars = "";
  const required: string[] = [];
  if (config.uppercase) {
    chars += u;
    required.push(u);
  }
  if (config.lowercase) {
    chars += l;
    required.push(l);
  }
  if (config.numbers) {
    chars += n;
    required.push(n);
  }
  if (config.symbols) {
    chars += s;
    required.push(s);
  }
  if (!chars) chars = l;
  const total = Math.max(12, length);
  const out: string[] = [];
  const rand = randomBytes(total + required.length);
  for (let i = 0; i < required.length; i++) {
    const pool = required[i];
    out.push(pool[rand[i] % pool.length]);
  }
  for (let i = 0; i < total; i++) {
    out.push(chars[rand[required.length + i] % chars.length]);
  }
  const bytes = randomBytes(out.length);
  for (let i = out.length - 1; i > 0; i--) {
    const j = bytes[i] % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.join("");
}

export function generateSecureToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}
