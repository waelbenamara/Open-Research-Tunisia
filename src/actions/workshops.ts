"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canCreateProject } from "@/lib/permissions";
import { audit, notify } from "@/lib/notify";
import { certCode, slugify } from "@/lib/format";
import { sendEmail } from "@/lib/email";
import { renderEmailHtml, renderEmailText, type EmailTemplate } from "@/lib/emailTemplates";
import type { ActionState } from "./auth";

async function assertFacilitator(workshopId: string) {
  const user = await requireUser();
  const workshop = await db.workshop.findUnique({
    where: { id: workshopId },
    select: { id: true, slug: true, title: true, facilitatorId: true, attendanceThreshold: true },
  });
  if (!workshop) throw new Error("Workshop not found");
  if (workshop.facilitatorId !== user.id && user.role !== "ADMIN") throw new Error("FORBIDDEN");
  return { user, workshop };
}

/* ── Create ─────────────────────────────────────────────── */

const workshopSchema = z.object({
  title: z.string().trim().min(6, "Give the workshop a title."),
  summary: z.string().trim().min(30, "Write a one-paragraph summary."),
  about: z.string().trim().default(""),
  level: z.string().default("Beginner"),
  outcomes: z.string().default(""),
  prerequisites: z.string().trim().default(""),
  startDate: z.string().min(1, "Pick a start date."),
  seats: z.coerce.number().int().min(1).max(1000),
  format: z.string().default("ONLINE"),
  location: z.string().trim().optional(),
  language: z.string().default("English"),
  attendanceThreshold: z.coerce.number().int().min(0).max(100).default(75),
  linkedProjectId: z.string().optional(),
});

export async function createWorkshopAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!canCreateProject(user)) {
    return { error: "You need posting rights to run a workshop." };
  }

  const parsed = workshopSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  if (d.format !== "ONLINE" && !d.location?.trim()) {
    return { error: "Add a location — people need to know where an in-person workshop happens." };
  }

  // Non-Latin titles (e.g. Arabic) slugify to "" — fall back to a safe base.
  let slug = slugify(d.title) || "workshop";
  if (await db.workshop.findUnique({ where: { slug } })) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const outcomes = d.outcomes
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 10);

  const workshop = await db.workshop.create({
    data: {
      slug,
      title: d.title,
      summary: d.summary,
      about: d.about,
      level: d.level,
      outcomes: JSON.stringify(outcomes),
      prerequisites: d.prerequisites,
      startDate: new Date(d.startDate),
      seats: d.seats,
      format: d.format,
      location: d.format === "ONLINE" ? null : d.location?.trim() || null,
      language: d.language,
      certificateEnabled: formData.get("certificateEnabled") !== null,
      attendanceThreshold: d.attendanceThreshold,
      facilitatorId: user.id,
      status: "OPEN",
    },
  });

  // Sessions arrive as structured JSON from the dynamic form; the legacy
  // "Title | 2026-08-03T18:30" one-per-line format is still accepted.
  type SessionRow = {
    workshopId: string;
    index: number;
    title: string;
    scheduledAt: Date;
    durationMin: number;
  };
  const sessionRows: SessionRow[] = [];
  const sessionsJson = String(formData.get("sessionsJson") || "").trim();
  if (sessionsJson) {
    try {
      const arr: unknown = JSON.parse(sessionsJson);
      if (Array.isArray(arr)) {
        for (const s of arr.slice(0, 20)) {
          const title = String((s as { title?: unknown }).title ?? "").trim();
          const at = String((s as { at?: unknown }).at ?? "").trim();
          const when = at ? new Date(at) : new Date(d.startDate);
          if (isNaN(when.getTime())) continue;
          sessionRows.push({
            workshopId: workshop.id,
            index: sessionRows.length + 1,
            title: title || `Session ${sessionRows.length + 1}`,
            scheduledAt: when,
            durationMin: Math.min(
              Math.max(Math.trunc(Number((s as { durationMin?: unknown }).durationMin)) || 90, 15),
              480,
            ),
          });
        }
      }
    } catch {
      // Malformed JSON just means no sessions yet — they can be added later.
    }
  } else {
    const sessionsRaw = String(formData.get("sessions") || "").trim();
    for (const line of sessionsRaw.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 20)) {
      const [title, when] = line.split("|").map((s) => s.trim());
      sessionRows.push({
        workshopId: workshop.id,
        index: sessionRows.length + 1,
        title: title || `Session ${sessionRows.length + 1}`,
        scheduledAt: when ? new Date(when) : new Date(d.startDate),
        durationMin: 90,
      });
    }
  }
  if (sessionRows.length) await db.workshopSession.createMany({ data: sessionRows });

  if (d.linkedProjectId) {
    await db.project.update({
      where: { id: d.linkedProjectId },
      data: { linkedWorkshopId: workshop.id },
    });
  }

  await audit(user.id, "WORKSHOP_CREATE", "Workshop", workshop.id, workshop.title);
  redirect(`/workshops/${workshop.slug}`);
}

const WORKSHOP_STATUSES = ["OPEN", "RUNNING", "COMPLETED", "DRAFT"];
const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const FORMATS = ["ONLINE", "IN_PERSON", "HYBRID"];

/** Edit a workshop's core details. Facilitator or admin only. Sessions are
 *  managed separately on the workshop page. */
export async function updateWorkshopAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const workshopId = String(formData.get("workshopId"));
  const { user, workshop } = await assertFacilitator(workshopId);

  const title = String(formData.get("title") || "").trim();
  const summary = String(formData.get("summary") || "").trim();
  if (title.length < 6) return { error: "Give the workshop a title (at least 6 characters)." };
  if (summary.length < 30) return { error: "Write a one-paragraph summary (at least 30 characters)." };

  const startRaw = String(formData.get("startDate") || "");
  const start = startRaw ? new Date(startRaw) : null;
  const level = LEVELS.includes(String(formData.get("level"))) ? String(formData.get("level")) : "Beginner";
  const format = FORMATS.includes(String(formData.get("format"))) ? String(formData.get("format")) : "ONLINE";
  const status = WORKSHOP_STATUSES.includes(String(formData.get("status")))
    ? String(formData.get("status"))
    : "OPEN";
  const seats = Math.min(Math.max(Number(formData.get("seats")) || 30, 1), 1000);
  const threshold = Math.min(Math.max(Number(formData.get("attendanceThreshold")) || 75, 0), 100);
  const outcomes = String(formData.get("outcomes") || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 10);

  await db.workshop.update({
    where: { id: workshopId },
    data: {
      title,
      summary,
      about: String(formData.get("about") || "").trim(),
      level,
      outcomes: JSON.stringify(outcomes),
      prerequisites: String(formData.get("prerequisites") || "").trim(),
      format,
      location: format === "ONLINE" ? null : String(formData.get("location") || "").trim() || null,
      language: String(formData.get("language") || "English"),
      seats,
      attendanceThreshold: threshold,
      certificateEnabled: formData.get("certificateEnabled") !== null,
      status,
      ...(start && !isNaN(start.getTime()) ? { startDate: start } : {}),
    },
  });

  await audit(user.id, "WORKSHOP_UPDATE", "Workshop", workshopId, title);
  revalidatePath(`/workshops/${workshop.slug}`);
  return { success: "Workshop updated." };
}

/* ── Enrolment ──────────────────────────────────────────── */

export async function enrollAction(formData: FormData) {
  const user = await requireUser();
  const workshopId = String(formData.get("workshopId"));

  const workshop = await db.workshop.findUnique({
    where: { id: workshopId },
    include: {
      facilitator: { select: { name: true } },
      enrollments: { where: { status: { in: ["ENROLLED", "COMPLETED"] } }, select: { id: true } },
    },
  });
  if (!workshop) throw new Error("Workshop not found");
  // DRAFT workshops aren't public; COMPLETED ones are over.
  if (workshop.status !== "OPEN" && workshop.status !== "RUNNING") {
    throw new Error("Enrolment is closed for this workshop.");
  }

  const existing = await db.enrollment.findUnique({
    where: { workshopId_userId: { workshopId, userId: user.id } },
  });

  // Full workshops don't reject people — they waitlist them.
  const full = workshop.enrollments.length >= workshop.seats;
  const status = full ? "WAITLIST" : "ENROLLED";
  const acted = !existing || existing.status === "DROPPED";

  if (existing) {
    if (existing.status === "DROPPED") {
      await db.enrollment.update({ where: { id: existing.id }, data: { status } });
    }
  } else {
    await db.enrollment.create({
      data: {
        workshopId,
        userId: user.id,
        status,
        motivation: String(formData.get("motivation") || "").trim(),
      },
    });
  }

  if (acted) {
    await audit(user.id, full ? "ENROLL_WAITLIST" : "ENROLL", "Workshop", workshopId, workshop.title);
  }

  await notify(user.id, {
    type: "ENROLLMENT",
    title: full ? `Waitlisted: ${workshop.title}` : `You're enrolled: ${workshop.title}`,
    body: full
      ? "The workshop is full. You'll be moved up automatically if a seat opens."
      : "Session links and materials will appear on the workshop page.",
    link: `/workshops/${workshop.slug}`,
  });

  // Confirm enrolment by email too (respecting the member's email preference).
  if (acted) {
    const me = await db.user.findUnique({
      where: { id: user.id },
      select: { email: true, name: true, emailUpdates: true },
    });
    if (me?.emailUpdates) {
      const h = await headers();
      const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;
      const started = workshop.startDate.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const template: EmailTemplate = {
        preheader: full
          ? `You're on the waitlist for ${workshop.title}.`
          : `You're enrolled in ${workshop.title}.`,
        heading: full ? "You're on the waitlist" : "You're enrolled",
        greeting: `Hi ${me.name.split(" ")[0]},`,
        paragraphs: full
          ? [
              `“${workshop.title}” is currently full, so you've been added to the waitlist. If a seat opens you'll be moved up automatically — and emailed.`,
              `Facilitated by ${workshop.facilitator.name} · starts ${started}.`,
            ]
          : [
              `You're enrolled in “${workshop.title}”. Session links, recordings and materials will appear on the workshop page.`,
              `Facilitated by ${workshop.facilitator.name} · starts ${started}.`,
            ],
        cta: { label: "View the workshop", url: `${origin}/workshops/${workshop.slug}` },
        footerNote: `Sent to ${me.email} because you ${full ? "joined the waitlist for" : "enrolled in"} this workshop. Manage email preferences in your profile.`,
      };
      await sendEmail({
        to: me.email,
        subject: full
          ? `Waitlisted: ${workshop.title} — Open Research Tunisia`
          : `You're enrolled: ${workshop.title} — Open Research Tunisia`,
        text: renderEmailText(template),
        html: renderEmailHtml(template),
      });
    }
  }

  revalidatePath(`/workshops/${workshop.slug}`);
  revalidatePath("/dashboard");
}

export async function dropEnrollmentAction(formData: FormData) {
  const user = await requireUser();
  const workshopId = String(formData.get("workshopId"));

  const enrollment = await db.enrollment.findUnique({
    where: { workshopId_userId: { workshopId, userId: user.id } },
    include: { workshop: { select: { slug: true, seats: true } } },
  });
  if (!enrollment) return;

  await db.enrollment.update({ where: { id: enrollment.id }, data: { status: "DROPPED" } });
  await audit(user.id, "ENROLLMENT_DROP", "Workshop", workshopId, enrollment.workshop.slug);

  // Promote the first person off the waitlist.
  const active = await db.enrollment.count({
    where: { workshopId, status: { in: ["ENROLLED", "COMPLETED"] } },
  });
  if (active < enrollment.workshop.seats) {
    const next = await db.enrollment.findFirst({
      where: { workshopId, status: "WAITLIST" },
      orderBy: { enrolledAt: "asc" },
      include: { workshop: { select: { title: true, slug: true } } },
    });
    if (next) {
      await db.enrollment.update({ where: { id: next.id }, data: { status: "ENROLLED" } });
      await notify(next.userId, {
        type: "ENROLLMENT",
        title: `A seat opened: ${next.workshop.title}`,
        body: "You've been moved off the waitlist and are now enrolled.",
        link: `/workshops/${next.workshop.slug}`,
      });
      // Being promoted off the waitlist is exactly the kind of thing to email.
      const promoted = await db.user.findUnique({
        where: { id: next.userId },
        select: { email: true, name: true, emailUpdates: true },
      });
      if (promoted?.emailUpdates) {
        const h = await headers();
        const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;
        const template: EmailTemplate = {
          preheader: `A seat opened — you're now enrolled in ${next.workshop.title}.`,
          heading: "A seat opened — you're in",
          greeting: `Hi ${promoted.name.split(" ")[0]},`,
          paragraphs: [
            `Good news: a seat opened in “${next.workshop.title}” and you've been moved off the waitlist. You're now enrolled.`,
            "Session links, recordings and materials are on the workshop page.",
          ],
          cta: { label: "View the workshop", url: `${origin}/workshops/${next.workshop.slug}` },
          footerNote: `Sent to ${promoted.email} because a seat opened in a workshop you were waitlisted for.`,
        };
        await sendEmail({
          to: promoted.email,
          subject: `A seat opened: ${next.workshop.title} — Open Research Tunisia`,
          text: renderEmailText(template),
          html: renderEmailHtml(template),
        });
      }
    }
  }

  revalidatePath(`/workshops/${enrollment.workshop.slug}`);
  revalidatePath("/dashboard");
}

/* ── Sessions ───────────────────────────────────────────── */

export async function addSessionAction(formData: FormData) {
  const workshopId = String(formData.get("workshopId"));
  const { user, workshop } = await assertFacilitator(workshopId);

  const count = await db.workshopSession.count({ where: { workshopId } });
  const scheduledAt = String(formData.get("scheduledAt") || "");
  const title = String(formData.get("title") || "").trim();
  if (!title) return;

  await db.workshopSession.create({
    data: {
      workshopId,
      index: count + 1,
      title,
      description: String(formData.get("description") || "").trim(),
      scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
      durationMin: Number(formData.get("durationMin") || 90) || 90,
      meetingUrl: String(formData.get("meetingUrl") || "").trim() || null,
    },
  });
  await audit(user.id, "SESSION_ADD", "Workshop", workshopId, title);

  const enrolled = await db.enrollment.findMany({
    where: { workshopId, status: "ENROLLED" },
    select: { userId: true },
  });
  await notify(
    enrolled.map((e) => e.userId),
    {
      type: "SESSION",
      title: `New session scheduled — ${workshop.title}`,
      body: `${title}${scheduledAt ? ` · ${new Date(scheduledAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}` : ""}`,
      link: `/workshops/${workshop.slug}`,
    },
  );
  revalidatePath(`/workshops/${workshop.slug}`);
}

export async function updateSessionAction(formData: FormData) {
  const sessionId = String(formData.get("sessionId"));
  const session = await db.workshopSession.findUnique({
    where: { id: sessionId },
    include: { workshop: { select: { id: true, slug: true } } },
  });
  if (!session) return;
  const { user, workshop } = await assertFacilitator(session.workshop.id);

  const recordingUrl = String(formData.get("recordingUrl") || "").trim() || null;
  await db.workshopSession.update({
    where: { id: sessionId },
    data: {
      recordingUrl,
      meetingUrl: String(formData.get("meetingUrl") || "").trim() || null,
    },
  });
  await audit(user.id, "SESSION_UPDATE", "WorkshopSession", sessionId, session.title);

  // A newly posted recording is the thing people who missed the session wait for.
  if (recordingUrl && !session.recordingUrl) {
    const enrolled = await db.enrollment.findMany({
      where: { workshopId: workshop.id, status: { in: ["ENROLLED", "COMPLETED"] } },
      select: { userId: true },
    });
    await notify(
      enrolled.map((e) => e.userId),
      {
        type: "RECORDING",
        title: `Recording available — ${workshop.title}`,
        body: session.title,
        link: `/workshops/${session.workshop.slug}`,
      },
    );
  }
  revalidatePath(`/workshops/${session.workshop.slug}`);
}

export async function markAttendanceAction(formData: FormData) {
  const sessionId = String(formData.get("sessionId"));
  const session = await db.workshopSession.findUnique({
    where: { id: sessionId },
    include: { workshop: { select: { id: true, slug: true } } },
  });
  if (!session) return;
  const { user } = await assertFacilitator(session.workshop.id);

  const presentIds = new Set(formData.getAll("present").map(String));
  const enrollments = await db.enrollment.findMany({
    where: { workshopId: session.workshop.id, status: { in: ["ENROLLED", "COMPLETED"] } },
    select: { userId: true },
  });

  for (const e of enrollments) {
    await db.attendance.upsert({
      where: { sessionId_userId: { sessionId, userId: e.userId } },
      create: { sessionId, userId: e.userId, present: presentIds.has(e.userId) },
      update: { present: presentIds.has(e.userId) },
    });
  }

  await audit(user.id, "ATTENDANCE_MARK", "WorkshopSession", sessionId, `${presentIds.size} present`);
  revalidatePath(`/workshops/${session.workshop.slug}`);
}

/* ── Assignments ────────────────────────────────────────── */

export async function addAssignmentAction(formData: FormData) {
  const workshopId = String(formData.get("workshopId"));
  const { user, workshop } = await assertFacilitator(workshopId);

  const title = String(formData.get("title") || "").trim();
  if (!title) return;
  const due = String(formData.get("dueDate") || "");

  await db.assignment.create({
    data: {
      workshopId,
      sessionId: String(formData.get("sessionId") || "") || null,
      title,
      description: String(formData.get("description") || "").trim(),
      dueDate: due ? new Date(due) : null,
      maxPoints: Number(formData.get("maxPoints") || 100) || 100,
    },
  });

  await audit(user.id, "ASSIGNMENT_ADD", "Workshop", workshopId, title);
  const enrolled = await db.enrollment.findMany({
    where: { workshopId, status: "ENROLLED" },
    select: { userId: true },
  });
  await notify(
    enrolled.map((e) => e.userId),
    {
      type: "ASSIGNMENT",
      title: `New assignment — ${workshop.title}`,
      body: title,
      link: `/workshops/${workshop.slug}?tab=assignments`,
    },
  );
  revalidatePath(`/workshops/${workshop.slug}`);
}

export async function submitAssignmentAction(formData: FormData) {
  const user = await requireUser();
  const assignmentId = String(formData.get("assignmentId"));

  const assignment = await db.assignment.findUnique({
    where: { id: assignmentId },
    include: { workshop: { select: { id: true, slug: true, title: true, facilitatorId: true } } },
  });
  if (!assignment) return;

  const enrollment = await db.enrollment.findUnique({
    where: { workshopId_userId: { workshopId: assignment.workshop.id, userId: user.id } },
  });
  if (!enrollment || enrollment.status === "DROPPED") throw new Error("Not enrolled");

  const body = String(formData.get("body") || "").trim();
  const url = String(formData.get("url") || "").trim() || null;
  if (!body && !url) return;

  await db.submission.upsert({
    where: { assignmentId_userId: { assignmentId, userId: user.id } },
    create: { assignmentId, userId: user.id, body, url },
    update: { body, url, submittedAt: new Date(), grade: null, feedback: null, gradedAt: null },
  });

  await audit(user.id, "SUBMISSION_ADD", "Assignment", assignmentId, assignment.title);
  await notify(assignment.workshop.facilitatorId, {
    type: "SUBMISSION",
    title: `New submission — ${assignment.title}`,
    body: `${user.name} submitted their work.`,
    link: `/workshops/${assignment.workshop.slug}?tab=assignments`,
  });
  revalidatePath(`/workshops/${assignment.workshop.slug}`);
}

export async function gradeSubmissionAction(formData: FormData) {
  const submissionId = String(formData.get("submissionId"));
  const submission = await db.submission.findUnique({
    where: { id: submissionId },
    include: {
      assignment: {
        include: { workshop: { select: { id: true, slug: true, title: true } } },
      },
    },
  });
  if (!submission) return;
  const { user } = await assertFacilitator(submission.assignment.workshop.id);

  const gradeRaw = String(formData.get("grade") || "");
  await db.submission.update({
    where: { id: submissionId },
    data: {
      grade: gradeRaw ? Number(gradeRaw) : null,
      feedback: String(formData.get("feedback") || "").trim() || null,
      gradedById: user.id,
      gradedAt: new Date(),
    },
  });

  await audit(user.id, "SUBMISSION_GRADE", "Submission", submissionId, gradeRaw || "ungraded");
  await notify(submission.userId, {
    type: "GRADE",
    title: `Feedback on ${submission.assignment.title}`,
    body: `Your facilitator reviewed your submission.`,
    link: `/workshops/${submission.assignment.workshop.slug}?tab=assignments`,
  });
  revalidatePath(`/workshops/${submission.assignment.workshop.slug}`);
}

/* ── Completion & certificates ──────────────────────────── */

/**
 * Issue certificates to everyone who cleared the attendance bar.
 * Deliberately explicit (facilitator-triggered) rather than automatic —
 * a credential should be a decision, not a side effect.
 */
export async function issueCertificatesAction(formData: FormData) {
  const workshopId = String(formData.get("workshopId"));
  const { user, workshop } = await assertFacilitator(workshopId);

  const [sessions, enrollments] = await Promise.all([
    db.workshopSession.findMany({ where: { workshopId }, select: { id: true } }),
    db.enrollment.findMany({
      where: { workshopId, status: { in: ["ENROLLED", "COMPLETED"] } },
      include: { user: { select: { id: true, name: true } } },
    }),
  ]);

  if (sessions.length === 0) return;
  const sessionIds = sessions.map((s) => s.id);
  let issued = 0;

  for (const e of enrollments) {
    const present = await db.attendance.count({
      where: { userId: e.userId, present: true, sessionId: { in: sessionIds } },
    });
    const pct = Math.round((present / sessions.length) * 100);
    if (pct < workshop.attendanceThreshold) continue;

    const already = await db.certificate.findUnique({
      where: { userId_workshopId: { userId: e.userId, workshopId } },
    });
    if (already) continue;

    await db.certificate.create({
      data: {
        code: certCode(),
        userId: e.userId,
        workshopId,
        title: workshop.title,
      },
    });
    await db.enrollment.update({
      where: { id: e.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    await db.contribution.create({
      data: {
        userId: e.userId,
        workshopId,
        text: `Completed “${workshop.title}” — certificate earned`,
        type: "WORKSHOP",
      },
    });
    await notify(e.userId, {
      type: "CERTIFICATE",
      title: `Certificate issued: ${workshop.title}`,
      body: "It's on your profile, and anyone can verify it with the code.",
      link: "/profile",
    });
    issued++;
  }

  await db.workshop.update({ where: { id: workshopId }, data: { status: "COMPLETED" } });
  await audit(user.id, "CERTIFICATES_ISSUED", "Workshop", workshopId, String(issued));
  revalidatePath(`/workshops/${workshop.slug}`);
}
