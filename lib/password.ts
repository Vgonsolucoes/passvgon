import bcrypt from "bcryptjs";

type HashAlgorithm = "argon2id" | "bcrypt";

let _argon2Import: Promise<typeof import("@node-rs/argon2")> | null = null;
function argon2() {
  if (!_argon2Import) {
    _argon2Import = import("@node-rs/argon2")
      .then((m) => m.default ?? m)
      .catch(() => null as unknown as typeof import("@node-rs/argon2"));
  }
  return _argon2Import;
}

export async function hashPassword(plaintext: string): Promise<{ hash: string; algo: HashAlgorithm }> {
  try {
    const mod = await argon2();
    if (mod?.hash) {
      const h = await mod.hash(plaintext, {
        algorithm: 2 as never, // Argon2id
        memoryCost: 19456, // 19 MiB
        timeCost: 2,
        parallelism: 1,
        outputLen: 32
      });
      return { hash: h, algo: "argon2id" };
    }
  } catch {
    // ignored — fallback bcrypt
  }
  const h = await bcrypt.hash(plaintext, 12);
  return { hash: h, algo: "bcrypt" };
}

export async function verifyPassword(
  plaintext: string,
  storedHash: string,
  algo: HashAlgorithm | null | undefined
): Promise<{ valid: boolean; shouldUpgrade: boolean }> {
  const detected = detectAlgo(storedHash, algo);
  if (detected === "argon2id") {
    try {
      const mod = await argon2();
      if (mod?.verify) {
        const valid = await mod.verify(storedHash, plaintext);
        return { valid, shouldUpgrade: false };
      }
    } catch {
      // fallback bcrypt
    }
  }
  const valid = await bcrypt.compare(plaintext, storedHash);
  const shouldUpgrade = detected !== "bcrypt" ? true : false;
  return { valid, shouldUpgrade };
}

function detectAlgo(storedHash: string, declared: HashAlgorithm | null | undefined): HashAlgorithm {
  if (declared === "argon2id" || declared === "bcrypt") return declared;
  if (storedHash.startsWith("$argon2")) return "argon2id";
  if (storedHash.startsWith("$2a$") || storedHash.startsWith("$2b$") || storedHash.startsWith("$2y$")) return "bcrypt";
  return "bcrypt";
}
