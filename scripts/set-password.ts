/**
 * Set/reset any user's password from the CLI (there's no in-app reset yet).
 *
 *   USER_EMAIL=you@example.com USER_PASSWORD='new-secret' npm run user:password
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = (process.env.USER_EMAIL || "").trim().toLowerCase();
  const password = process.env.USER_PASSWORD || "";
  if (!email || password.length < 8) {
    console.error("Set USER_EMAIL and USER_PASSWORD (min 8 chars).");
    process.exit(1);
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user with email ${email}.`);
    process.exit(1);
  }

  await db.user.update({
    where: { email },
    data: { passwordHash: await bcrypt.hash(password, 10) },
  });
  // Force re-login everywhere.
  await db.session.deleteMany({ where: { userId: user.id } });

  console.log(`✓ Password updated for ${email}. Existing sessions cleared.`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
