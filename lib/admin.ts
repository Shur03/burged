import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { connection } from "next/server";

const sessionName = "door_admin";
const sessionAge = 60 * 60 * 8;

function password() {
  const value = process.env.DOOR_ADMIN_PASSWORD;
  return value && value.length >= 16 ? value : undefined;
}

function equal(a: string, b: string) {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(a), digest(b));
}

function signature(secret: string, expires: string) {
  return createHmac("sha256", secret).update(`door-admin:${expires}`).digest("base64url");
}

export function adminConfigured() {
  return Boolean(password());
}

export async function signIn(candidate: string) {
  const secret = password();
  if (!secret || !equal(secret, candidate)) return false;

  const expires = String(Math.floor(Date.now() / 1000) + sessionAge);
  (await cookies()).set(sessionName, `${expires}.${signature(secret, expires)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: sessionAge,
    path: "/",
  });
  return true;
}

export async function isAdmin() {
  await connection();
  const secret = password();
  if (!secret) return false;

  // Read the incoming cookie without the Next.js dev wrapper that can fail during action renders.
  const cookieHeader = (await headers()).get("cookie");
  const prefix = `${sessionName}=`;
  const cookie = cookieHeader?.split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
  if (!cookie) return false;

  const [expires, signed, extra] = cookie.split(".");
  return !extra && Boolean(signed) && /^\d+$/.test(expires)
    && Number(expires) > Math.floor(Date.now() / 1000)
    && equal(signature(secret, expires), signed);
}

export async function signOut() {
  (await cookies()).delete(sessionName);
}
