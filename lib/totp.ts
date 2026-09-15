import { authenticator } from "otplib";
import { encode as encodeBase32 } from "hi-base32";
import { randomBytes, createHash } from "node:crypto";
import QRCode from "qrcode";
import { encryptSecret, decryptSecret, constantTimeEqual } from "./crypto";

authenticator.options = {
  window: 1,
  step: 30,
  digits: 6
};

export type TwoFactorSetup = {
  secretPlaintext: string; // só retornado uma vez no setup
  secretEncrypted: string;
  otpAuthUrl: string;
  qrCodeDataUrl: string;
  recoveryCodes: { plaintext: string; sha256: string }[];
  recoveryCodesJson: string; // JSON serializado de hashes SHA-256 para armazenar
};

export function generateBase32Secret(lengthBytes = 20): string {
  const bytes = randomBytes(lengthBytes);
  return encodeBase32(bytes).replace(/=/g, "").toUpperCase();
}

export async function createTwoFactorSetup(opts: {
  issuer?: string;
  accountName: string;
}): Promise<TwoFactorSetup> {
  const issuer = opts.issuer ?? "PassVGON";
  const secret = generateBase32Secret(20);
  const otpAuthUrl = authenticator.keyuri(opts.accountName, issuer, secret);
  const qrDataUrl = await QRCode.toDataURL(otpAuthUrl, {
    margin: 1,
    width: 256,
    color: { dark: "#001F3F", light: "#FFFFFF" }
  });
  const recoveryCodes: { plaintext: string; sha256: string }[] = [];
  for (let i = 0; i < 8; i++) {
    const plain = generateRecoveryCode();
    recoveryCodes.push({
      plaintext: plain,
      sha256: sha256Hex(plain)
    });
  }
  return {
    secretPlaintext: secret,
    secretEncrypted: encryptSecret(secret),
    otpAuthUrl,
    qrCodeDataUrl: qrDataUrl,
    recoveryCodes,
    recoveryCodesJson: JSON.stringify(recoveryCodes.map((r) => r.sha256))
  };
}

export function generateRecoveryCode(): string {
  const raw = randomBytes(5).toString("hex").toUpperCase();
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`;
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function verifyTOTP(params: {
  code: string;
  secretEncrypted: string | null | undefined;
  lastUsedTotp: string | null | undefined; // "<unixStep>:<code>" anti-replay
}): { valid: boolean; newLastTotp: string | null } {
  if (!params.secretEncrypted || !params.code) return { valid: false, newLastTotp: null };
  const secret = decryptSecret(params.secretEncrypted);
  if (!secret) return { valid: false, newLastTotp: null };
  const code = String(params.code).replace(/\s+/g, "");
  if (!/^\d{6}$/.test(code)) return { valid: false, newLastTotp: null };
  let ok = false;
  let validStep: number | null = null;
  try {
    const nowStep = Math.floor(Date.now() / 30_000);
    const windowOpt = authenticator.options.window ?? 1;
    const wHalf = typeof windowOpt === "number" ? windowOpt : Math.max(windowOpt[0], windowOpt[1]);
    for (let delta = -wHalf; delta <= wHalf; delta++) {
      const step = nowStep + delta;
      const expected = (authenticator as unknown as { generate: (s: string, epoch: number) => string }).generate(secret, step * 30);
      if (constantTimeEqual(expected, code)) {
        ok = true;
        validStep = step;
        break;
      }
    }
  } catch {
    return { valid: false, newLastTotp: null };
  }
  if (!ok || validStep == null) return { valid: false, newLastTotp: null };
  const antiReplayKey = `${validStep}:${code}`;
  if (params.lastUsedTotp && params.lastUsedTotp === antiReplayKey) {
    return { valid: false, newLastTotp: null }; // TOTP reutilizado: REJEITADO
  }
  return { valid: true, newLastTotp: antiReplayKey };
}

export function verifyRecoveryCode(params: {
  code: string;
  backupCodesJson: string | null | undefined;
}): { valid: boolean; remainingHashes: string[] | null } {
  if (!params.backupCodesJson || !params.code) return { valid: false, remainingHashes: null };
  let list: string[];
  try {
    list = JSON.parse(params.backupCodesJson);
    if (!Array.isArray(list)) return { valid: false, remainingHashes: null };
  } catch {
    return { valid: false, remainingHashes: null };
  }
  const normalized = String(params.code).trim().toUpperCase().replace(/=/g, "");
  const hash = sha256Hex(normalized);
  const idx = list.findIndex((h) => constantTimeEqual(h, hash));
  if (idx < 0) return { valid: false, remainingHashes: null };
  const remaining = list.slice();
  remaining.splice(idx, 1);
  return { valid: true, remainingHashes: remaining };
}
