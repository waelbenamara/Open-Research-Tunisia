import Link from "next/link";
import { Card } from "@/components/ui";

export const metadata = {
  title: "About",
  description: "How Open Research Tunisia works, and why it exists.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-[760px] px-4 sm:px-8 pb-24 pt-16">
      <div className="eyebrow mb-2.5" style={{ color: "#8a3325" }}>
        An open initiative · Est. 2026
      </div>
      <h1 className="font-serif text-[40px] font-medium leading-[1.1] balance">
        Bringing greater access to academic research in Tunisia.
      </h1>

      <div className="mt-7 flex flex-col gap-5 text-[16px] leading-[1.75] text-ink-2 pretty">
        <p>
          Tunisia possesses a wealth of curious and capable talent, yet it severely lacks{" "}
          <em>access</em>. For those not already affiliated with a formal laboratory, opportunities to conduct
          research are exceptionally rare. Without the means to develop foundational skills, establish a publication record, or receive proper academic credit, students face significant barriers to entering the research community and building long-term careers.
        </p>
        <p>
          Open Research Tunisia is an attempt to overcome this. Researchers post real
          projects with real open roles. Anyone can apply. Workshops teach the specific skills those
          projects need, free and recorded. And every contribution is logged publicly, against the
          same contributor taxonomy journals use — so credit is a matter of record, not of who you
          know.
        </p>
      </div>

      <h2 className="mt-14 font-serif text-[26px] font-medium">How it works</h2>
      <div className="mt-5 flex flex-col gap-4">
        <Row
          title="Approved leads launch projects"
          body="Anyone can request posting rights, but an admin reviews every request. Leading a project means committing to actively mentor and guide incoming student contributors."
        />
        <Row
          title="Contributors apply to specific roles"
          body="Each project outlines its exact needs and required skills. Leads review the applications, knowing that drive and a willingness to learn often count more than past credentials."
        />
        <Row
          title="Research happens in the open"
          body="Resources, meeting notes, and decisions live transparently on the project page. New contributors can absorb the entire history of a study before joining the discussion."
        />
        <Row
          title="Workshops bridge the knowledge gap"
          body="These sessions are free, hosted live, recorded, and tied directly to active projects. Complete enough modules to earn a publicly verifiable certificate."
        />
        <Row
          title="Credit is explicit and transparent"
          body="Contributions are tracked using standard CRediT roles—the same taxonomy used by major journals. The final author list is generated directly from this public ledger before submission."
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
