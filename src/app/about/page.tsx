import Link from "next/link";
import { db } from "@/lib/db";
import { Card, StatCard } from "@/components/ui";

export const metadata = {
  title: "About",
  description: "How Open Research Tunisia works, and why it exists.",
};

export default async function AboutPage() {
  const [projects, workshops, members, certificates, outputs, contributions] = await Promise.all([
    db.project.count({ where: { archived: false } }),
    db.workshop.count(),
    db.user.count(),
    db.certificate.count(),
    db.output.count(),
    db.contribution.count(),
  ]);

  return (
    <div className="mx-auto w-full max-w-[760px] px-8 pb-24 pt-16">
      <div className="eyebrow mb-2.5" style={{ color: "#8a3325" }}>
        An open initiative · Est. 2026
      </div>
      <h1 className="font-serif text-[40px] font-medium leading-[1.1] balance">
        Research shouldn&apos;t require permission.
      </h1>

      <div className="mt-7 flex flex-col gap-5 text-[16px] leading-[1.75] text-ink-2 pretty">
        <p>
          Tunisia has no shortage of curious, capable people. What it has a shortage of is{" "}
          <em>doors</em>. If you aren&apos;t already inside a lab, there is usually no way to work on
          real research — no way to learn the craft, no way to build a record, no way to be credited
          for what you did.
        </p>
        <p>
          Open Research Tunisia is an attempt at a different arrangement. Researchers post real
          projects with real open roles. Anyone can apply. Workshops teach the specific skills those
          projects need, free and recorded. And every contribution is logged publicly, against the
          same contributor taxonomy journals use — so credit is a matter of record, not of who you
          know.
        </p>
      </div>

      <div className="mt-11 grid gap-4 sm:grid-cols-3">
        <StatCard n={projects} label="Research projects" />
        <StatCard n={workshops} label="Workshops run" />
        <StatCard n={members} label="Members" />
        <StatCard n={contributions} label="Logged contributions" />
        <StatCard n={certificates} label="Certificates issued" />
        <StatCard n={outputs} label="Outputs produced" />
      </div>

      <h2 className="mt-14 font-serif text-[26px] font-medium">How it works</h2>
      <div className="mt-5 flex flex-col gap-4">
        <Row
          title="Projects are posted by approved leads"
          body="Anyone can request posting rights, but an admin reviews the request — because posting a project means taking responsibility for other people's evenings."
        />
        <Row
          title="Contributors apply to specific roles"
          body="Each project lists what it needs and what skills that takes. The lead reviews applications and decides. Motivation counts more than credentials."
        />
        <Row
          title="Work happens in the open"
          body="Resources, meeting notes, decisions and discussion live on the project page. New contributors can read the whole history before they say a word."
        />
        <Row
          title="Workshops close the skill gap"
          body="Free, live, recorded, and linked to a project. Attend enough sessions and you earn a certificate anyone can verify at a public URL."
        />
        <Row
          title="Credit is explicit"
          body="Contributions are logged against CRediT roles — the same taxonomy used by most journals. The author line of a paper is generated from that ledger, visible to everyone, before anything is submitted."
        />
      </div>

      <h2 className="mt-14 font-serif text-[26px] font-medium">What we ask of you</h2>
      <div className="mt-5 flex flex-col gap-4 text-[15px] leading-[1.7] text-ink-2">
        <p>
          Show up when you said you would. Report results honestly, including the ones that
          didn&apos;t work. Credit people for what they actually did. Assume the person asking a
          basic question is the reason this exists.
        </p>
        <p>
          The full <Link href="/code-of-conduct">code of conduct</Link> is short and we mean it.
        </p>
      </div>

      <Card className="mt-12 px-7 py-6">
        <div className="font-serif text-[20px] font-medium">Ready to start?</div>
        <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-3">
          Create an account, list your skills, and apply to something. It costs nothing and takes
          about ten minutes.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/register"
            className="bg-brick px-5 py-2.5 text-[13.5px] font-semibold no-underline hover:bg-brick-dark hover:no-underline"
            style={{ color: "#faf8f3" }}
          >
            Join the initiative
          </Link>
          <Link
            href="/?filter=recruiting"
            className="border border-line-input bg-card px-5 py-2.5 text-[13.5px] font-semibold text-ink-4 no-underline hover:border-brick hover:text-brick hover:no-underline"
          >
            See what&apos;s recruiting
          </Link>
        </div>
      </Card>
    </div>
  );
}

function Row({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-l-2 border-line pl-5">
      <div className="text-[15.5px] font-semibold">{title}</div>
      <p className="mt-1 text-[14.5px] leading-[1.65] text-ink-3 pretty">{body}</p>
    </div>
  );
}
