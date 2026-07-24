import "server-only";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { cache } from "react";
import { db } from "./db";
import { avatarSrc } from "./format";

const COOKIE = "ort_session";
const MAX_AGE_DAYS = 30;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  canPostProjects: boolean;
  avatarColor: string;
  /** Resolved picture URL (uploaded or OAuth), null → initials. */
  avatarSrc: string | null;
  affiliation: string | null;
  headline: string | null;
};

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + MAX_AGE_DAYS * 864e5);
  const session = await db.session.create({ data: { userId, expiresAt } });
  const jar = await cookies();
  jar.set(COOKIE, session.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (id) await db.session.deleteMany({ where: { id } });
  jar.delete(COOKIE);
}

/** Cached per-request so a page can call it freely. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (!id) return null;

  const session = await db.session.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date() || session.user.suspended) return null;

  const u = session.user;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    canPostProjects: u.canPostProjects,
    avatarColor: u.avatarColor,
    avatarSrc: avatarSrc(u),
    affiliation: u.affiliation,
    headline: u.headline,
  };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new Error("FORBIDDEN");
  return user;
}
