/** Dev helper: mint a session cookie value for a seeded user, for smoke testing.
 *    npx tsx scripts/mksession.ts amine@ort.tn
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const user = await db.user.findUniqueOrThrow({ where: { email } });
  const session = await db.session.create({
    data: { userId: user.id, expiresAt: new Date(Date.now() + 864e5) },
  });
  console.log(session.id);
  await db.$disconnect();
}

main();
