import Link from "next/link";
import { db } from "@/lib/db";
import { fullDate } from "@/lib/format";
import { Card } from "@/components/ui";

export const metadata = { title: "Verify a certificate" };

export default async function VerifyCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const cert = await db.certificate.findUnique({
    where: { code: decodeURIComponent(code).toUpperCase() },
    include: {
      user: { select: { id: true, name: true, affiliation: true } },
      workshop: {
        select: {
          slug: true,
          title: true,
          level: true,
          attendanceThreshold: true,
          facilitator: { select: { name: true, affiliation: true } },
          sessions: { select: { id: true } },
        },
      },
    },
  });

  if (!cert || cert.revoked) {
    return (
      <div className="mx-auto w-full max-w-[560px] px-4 sm:px-8 py-20 text-center">
        <div className="eyebrow mb-3">Certificate verification</div>
        <h1 className="font-serif text-[30px] font-medium">Not a valid certificate</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-3">
          No live certificate matches the code <span className="font-mono">{code}</span>. Check for
          typos — codes look like <span className="font-mono">ORT-ABCDE-12345</span>.
        </p>
        <p className="mt-6 text-[13.5px]">
          <Link href="/verify">Try another code</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[620px] px-4 sm:px-8 py-16">
      <div className="eyebrow mb-3">Certificate verification</div>
      <Card className="border-t-[4px] border-t-brick px-9 py-9">
        <div className="mb-1 inline-block bg-olive-tint px-3 py-1 text-[12px] font-semibold text-olive-dark">
          ✓ Valid certificate
        </div>
        <h1 className="mt-4 font-serif text-[28px] font-medium leading-snug balance">
          {cert.title}
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-2">
          <Link href={`/people/${cert.user.id}`} className="font-semibold">
            {cert.user.name}
          </Link>
          {cert.user.affiliation ? ` (${cert.user.affiliation})` : ""} completed this{" "}
          {cert.workshop.level.toLowerCase()} workshop, attending at least{" "}
          {cert.workshop.attendanceThreshold}% of its {cert.workshop.sessions.length} sessions.
        </p>

        <dl className="mt-7 flex flex-col gap-3 border-t border-line-soft pt-6 text-[13.5px]">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Issued</dt>
            <dd className="font-semibold">{fullDate(cert.issuedAt)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Facilitator</dt>
            <dd className="font-semibold">
              {cert.workshop.facilitator.name}
              {cert.workshop.facilitator.affiliation
                ? `, ${cert.workshop.facilitator.affiliation}`
                : ""}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Certificate code</dt>
            <dd className="font-mono font-semibold">{cert.code}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Issued by</dt>
            <dd className="font-semibold">Open Research Tunisia</dd>
          </div>
        </dl>

        <p className="mt-7 border-t border-line-soft pt-5 text-[12.5px] leading-relaxed text-muted">
          Anyone can check this page — no account needed. Certificates record attendance, not an
          examination.{" "}
          <Link href={`/workshops/${cert.workshop.slug}`}>See what the workshop covered</Link>.
        </p>
      </Card>
    </div>
  );
}
