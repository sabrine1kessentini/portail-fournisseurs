import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getEnv } from "@/lib/env";
import type { Locale } from "@prisma/client";
import { BUYER_COOKIE_NAME } from "./cookie-names";

export { BUYER_COOKIE_NAME };
const SESSION_DURATION = "7d";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getSecretKey() {
  return new TextEncoder().encode(getEnv().AUTH_SECRET);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface BuyerSessionPayload {
  buyerId: string;
  email: string;
  name: string;
  locale: Locale;
}

export async function createBuyerSessionCookie(payload: BuyerSessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(BUYER_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function destroyBuyerSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(BUYER_COOKIE_NAME);
}

export async function verifyBuyerSessionToken(
  token: string
): Promise<BuyerSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as BuyerSessionPayload;
  } catch {
    return null;
  }
}

export async function getBuyerSession(): Promise<BuyerSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(BUYER_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyBuyerSessionToken(token);
}
