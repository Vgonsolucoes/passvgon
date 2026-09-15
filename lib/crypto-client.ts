const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const NUMBERS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.<>?/";
const ALL = UPPER + LOWER + NUMBERS + SYMBOLS;

function getCrypto(): Crypto {
  const g = globalThis as unknown as { crypto?: Crypto };
  if (typeof g !== "undefined" && g.crypto && typeof g.crypto.getRandomValues === "function") {
    return g.crypto;
  }
  const w = (typeof window !== "undefined" ? window : undefined) as unknown as { crypto?: Crypto } | undefined;
  if (w && w.crypto && typeof w.crypto.getRandomValues === "function") {
    return w.crypto;
  }
  throw new Error("Ambiente sem suporte a Web Crypto API.");
}

function secureRandomBytes(length: number): Uint8Array {
  const c = getCrypto();
  const buf = new Uint8Array(length);
  c.getRandomValues(buf);
  return buf;
}

export function generateSecurePassword(length = 20): string {
  const size = Math.max(12, Math.min(128, Math.floor(length)));
  const bytes = secureRandomBytes(size * 2);
  const chars: string[] = [];
  chars.push(UPPER[bytes[0] % UPPER.length]);
  chars.push(LOWER[bytes[1] % LOWER.length]);
  chars.push(NUMBERS[bytes[2] % NUMBERS.length]);
  chars.push(SYMBOLS[bytes[3] % SYMBOLS.length]);
  for (let i = 4; i < size; i++) {
    const b = bytes[i] ?? secureRandomBytes(1)[0];
    chars.push(ALL[b % ALL.length]);
  }
  for (let i = chars.length - 1; i > 0; i--) {
    const j = (secureRandomBytes(1)[0] ?? 0) % (i + 1);
    const tmp = chars[i];
    chars[i] = chars[j];
    chars[j] = tmp;
  }
  return chars.join("");
}

export function generateSecureToken(bytes = 32): string {
  const buf = secureRandomBytes(bytes);
  let out = "";
  for (let i = 0; i < buf.length; i++) {
    out += buf[i].toString(16).padStart(2, "0");
  }
  return out;
}
