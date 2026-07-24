/**
 * Empties every table — a clean slate with no seed/demo data.
 * Use before going live so no fictional users or content remain.
 *
 *   npm run db:wipe
 *
 * This does NOT re-seed. Do not run `npm run db:seed` / `db:reset` on a
 * production database afterwards — those re-insert the fictional demo data.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// Every model's table. TRUNCATE ... CASCADE clears them regardless of FK order.
const TABLES = [
  "User", "Session", "OAuthAccount", "PostingRequest",
  "Project", "ProjectMember", "Opening", "Application",
  "Resource", "Meeting", "Announcement", "Message", "Task",
  "Contribution", "Output",
  "Workshop", "WorkshopSession", "Enrollment", "Attendance",
  "Assignment", "Submission", "Certificate",
  "Notification", "AuditLog", "Bookmark",
];

async function main() {
  const list = TABLES.map((t) => `"${t}"`).join(", ");
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`);

  const users = await db.user.count();
  const projects = await db.project.count();
  const workshops = await db.workshop.count();
  console.log(`✓ Database wiped. users=${users} projects=${projects} workshops=${workshops}`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
