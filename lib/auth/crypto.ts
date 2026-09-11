import crypto from "crypto";

/** Génère un token opaque aléatoire (jamais stocké en clair, voir hashToken). */
export function generateToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
