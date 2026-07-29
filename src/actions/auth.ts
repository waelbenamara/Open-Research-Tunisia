"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  createSession,
  destroySession,
  getCurrentUser,
  hashPassword,
  verifyPassword,
  requireUser,
} from "@/lib/auth";
import { avatarColor } from "@/lib/format";
import { appOrigin } from "@/lib/appUrl";
import { audit } from "@/lib/notify";
import { deleteObject, storeUpload } from "@/lib/storage";
import { sendEmail } from "@/lib/email";
import { renderEmailHtml, renderEmailText, type EmailTemplate } from "@/lib/emailTemplates";
import { welcomeEmail } from "@/lib/welcomeEmail";
import { notifyAdminsOfNewMember } from "@/lib/newMemberAlert";

export type ActionState = { error?: string; success?: string } | null;

/** Canonical base URL for the links in the emails this file sends. */
async function requestOrigin() {
  return appOrigin();
}

const registerSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name."),
  email: z.string().trim().toLowerCase().email("That doesn't look like a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  affiliation: z.string().trim().optional(),
  city: z.string().trim().optional(),
  coc: z.string().optional(),
});

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { name, email, password, affiliation, city, coc } = parsed.data;

  if (coc !== "on") {
    return { error: "You must accept the code of conduct to join." };
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with that email already exists. Try signing in." };
  }

  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      affiliation: affiliation || null,
      city: city || null,
      avatarColor: avatarColor(name),
      cocAcceptedAt: new Date(),
    },
  });

  await db.notification.create({
    data: {
      userId: user.id,
      type: "WELCOME",
      title: "Welcome to Open Research Tunisia",
      body: "Add your skills to your profile so project leads can find you, then browse projects that are recruiting.",
      link: "/profile/edit",
    },
  });

  const origin = await requestOrigin();
  await sendEmail(welcomeEmail(user.name, user.email, origin));
  await notifyAdminsOfNewMember(
    { id: user.id, name: user.name, email: user.email, affiliation: user.affiliation, city: user.city },
    origin,
    "password",
  );

  await audit(user.id, "REGISTER", "User", user.id, "password");
  await createSession(user.id);
  redirect("/onboarding");
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(1, "Enter your password."),
});

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { email, password } = parsed.data;
  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    return { error: "Email or password is incorrect." };
  }
  if (!user.passwordHash) {
    return {
      error: "This account signs in with Google or GitHub. Use the button below.",
    };
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    return { error: "Email or password is incorrect." };
  }
  if (user.suspended) {
    return { error: "This account has been suspended. Contact an administrator." };
  }

  await createSession(user.id);
  // Mirrors OAUTH_LOGIN in the OAuth callback, so every sign-in is on the record.
  await audit(user.id, "LOGIN", "User", user.id, "password");
  const next = String(formData.get("next") || "/");
  redirect(next.startsWith("/") ? next : "/");
}

const RESET_TOKEN_TTL_MIN = 60;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function forgotPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = z
    .object({ email: z.string().trim().toLowerCase().email("Enter a valid email.") })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // The response is identical whether or not the account exists, so this
  // form can't be used to probe which emails are registered.
  const generic = {
    success:
      "If an account exists for that address, we've emailed a reset link. It expires in one hour — check your spam folder too.",
  };

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || user.suspended) return generic;

  // One email per two minutes per account, so the form can't be used to flood an inbox.
  const recent = await db.passwordResetToken.findFirst({
    where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 2 * 60_000) } },
  });
  if (recent) return generic;

  await audit(user.id, "PASSWORD_RESET_REQUEST", "User", user.id);

  const token = randomBytes(32).toString("base64url");
  await db.passwordResetToken.deleteMany({ where: { userId: user.id } });
  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MIN * 60_000),
    },
  });

  const link = `${await requestOrigin()}/reset-password/${token}`;

  const template: EmailTemplate = {
    preheader: "Set a new password — this link is valid for one hour.",
    heading: "Reset your password",
    greeting: `Hi ${user.name.split(" ")[0]},`,
    paragraphs: [
      "Someone — hopefully you — asked to reset the password for this account on Open Research Tunisia.",
    ],
    cta: { label: "Set a new password", url: link },
    afterCta: [
      "The link is valid for one hour and can be used once. Using it signs you out everywhere else.",
      `If the button doesn't work, copy this address: ${link}`,
      "If you didn't ask for this, ignore this email — your password is unchanged.",
    ],
    footerNote: `Sent to ${user.email} because a password reset was requested for this account.`,
  };

  await sendEmail({
    to: user.email,
    subject: "Reset your password — Open Research Tunisia",
    text: renderEmailText(template),
    html: renderEmailHtml(template),
  });

  return generic;
}

const resetSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "Passwords don't match." });

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const row = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(parsed.data.token) },
    include: { user: true },
  });
  if (!row || row.expiresAt < new Date()) {
    return { error: "This reset link is invalid or has expired. Request a new one." };
  }
  if (row.user.suspended) {
    return { error: "This account has been suspended. Contact an administrator." };
  }

  await db.user.update({
    where: { id: row.userId },
    // Following the link proves control of the inbox, so the email is verified too.
    data: { passwordHash: await hashPassword(parsed.data.password), emailVerified: true },
  });
  // Single-use token, and every existing session is signed out — if the reset
  // was prompted by a compromise, the attacker's session dies here.
  await db.passwordResetToken.deleteMany({ where: { userId: row.userId } });
  await db.session.deleteMany({ where: { userId: row.userId } });

  await audit(row.userId, "PASSWORD_RESET", "User", row.userId);
  await createSession(row.userId);
  redirect("/");
}

export async function logoutAction() {
  const user = await getCurrentUser();
  await destroySession();
  if (user) await audit(user.id, "LOGOUT", "User", user.id);
  revalidatePath("/", "layout");
  redirect("/");
}

const profileSchema = z.object({
  name: z.string().trim().min(2, "Name is required."),
  headline: z.string().trim().max(120).optional(),
  affiliation: z.string().trim().max(160).optional(),
  city: z.string().trim().max(80).optional(),
  bio: z.string().trim().max(1200).optional(),
  skills: z.string().optional(),
  languages: z.string().optional(),
  orcid: z.string().trim().max(40).optional(),
  website: z.string().trim().optional(),
  scholar: z.string().trim().optional(),
  github: z.string().trim().optional(),
});

function splitList(v: string | undefined) {
  return (v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
}

const AVATAR_EXTS = new Set(["png", "jpg", "jpeg", "webp", "gif"]);
const AVATAR_MAX_BYTES = 4 * 1024 * 1024;

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  // Profile picture: upload replaces, "remove" clears. Old objects are deleted
  // so storage doesn't accumulate orphans.
  const current = await db.user.findUnique({
    where: { id: user.id },
    select: { avatarPath: true },
  });
  let avatarChange: { avatarPath: string | null; avatarUrl?: null } | null = null;

  const upload = formData.get("avatar");
  if (upload instanceof File && upload.size > 0) {
    const ext = (upload.name.split(".").pop() ?? "").toLowerCase();
    if (!AVATAR_EXTS.has(ext)) {
      return { error: "Profile pictures can be PNG, JPG, WebP, or GIF." };
    }
    if (upload.size > AVATAR_MAX_BYTES) {
      return { error: "Profile pictures are limited to 4 MB." };
    }
    const stored = await storeUpload(upload);
    if (!stored) return { error: "Upload failed — try again." };
    avatarChange = { avatarPath: stored.filePath };
  } else if (formData.get("removeAvatar") === "on") {
    avatarChange = { avatarPath: null, avatarUrl: null };
  }
  if (avatarChange && current?.avatarPath) await deleteObject(current.avatarPath);

  await db.user.update({
    where: { id: user.id },
    data: {
      ...(avatarChange ?? {}),
      name: d.name,
      headline: d.headline || null,
      affiliation: d.affiliation || null,
      city: d.city || null,
      bio: d.bio || null,
      skills: JSON.stringify(splitList(d.skills)),
      languages: JSON.stringify(splitList(d.languages)),
      orcid: d.orcid || null,
      website: d.website || null,
      scholar: d.scholar || null,
      github: d.github || null,
      // Unchecked checkbox is simply absent from the form data.
      emailUpdates: formData.get("emailUpdates") === "on",
    },
  });

  await audit(user.id, "PROFILE_UPDATE", "User", user.id, avatarChange ? "including picture" : "");
  revalidatePath("/profile");
  revalidatePath("/profile/edit");
  return { success: "Profile saved." };
}

/** OAuth signups skip the registration form, so they accept the CoC here instead. */
export async function acceptCodeOfConductAction() {
  const user = await requireUser();
  await db.user.update({
    where: { id: user.id },
    data: { cocAcceptedAt: new Date() },
  });
  await audit(user.id, "COC_ACCEPT", "User", user.id);
  revalidatePath("/", "layout");
  redirect("/onboarding");
}

export async function requestPostingRightsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const proposal = String(formData.get("proposal") || "").trim();
  const motivation = String(formData.get("motivation") || "").trim();

  if (proposal.length < 8) return { error: "Describe the project you'd like to post." };
  if (motivation.length < 20)
    return { error: "Tell the admins a little about your background — a few sentences." };

  const open = await db.postingRequest.findFirst({
    where: { userId: user.id, status: "PENDING" },
  });
  if (open) return { error: "You already have a request awaiting review." };

  await db.postingRequest.create({
    data: { userId: user.id, proposal, motivation },
  });
  await audit(user.id, "POSTING_REQUEST", "User", user.id, proposal.slice(0, 60));

  const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  await db.notification.createMany({
    data: admins.map((a) => ({
      userId: a.id,
      type: "POSTING_REQUEST",
      title: "New posting-rights request",
      body: `${user.name} would like to post: “${proposal}”`,
      link: "/admin?tab=posters",
    })),
  });

  revalidatePath("/request-posting-rights");
  return { success: "Request submitted. An admin will review it shortly." };
}
