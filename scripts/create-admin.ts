/**
 * Create (or promote) an administrator account.
 *
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='secret' ADMIN_NAME='Your Name' \
 *     npm run admin:create
 *
 * If the email already exists, it's promoted to ADMIN and (if a password is
 * given) its password is reset. Safe to run more than once.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const AVATARS = ["#8a3325", "#4d6b3c", "#4f4370", "#7a5b16", "#3d5a6b", "#6b3d5a"];
function avatarColor(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return AVATARS[h % AVATARS.length];
}

async function main() {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  const name = (process.env.ADMIN_NAME || "Administrator").trim();

  if (!email || !password) {
    console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD.");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("ADMIN_PASSWORD must be at least 8 characters.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await db.user.upsert({
    where: { email },
    update: { role: "ADMIN", canPostProjects: true, passwordHash, suspended: false },
    create: {
      email,
      name,
      passwordHash,
      role: "ADMIN",
      canPostProjects: true,
      emailVerified: true,
      cocAcceptedAt: new Date(),
      avatarColor: avatarColor(name),
    },
  });

  console.log(`✓ Admin ready: ${user.email}  (role=${user.role}, canPostProjects=${user.canPostProjects})`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
