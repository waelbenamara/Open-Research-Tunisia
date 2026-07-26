import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canCreateProject } from "@/lib/permissions";
import { Breadcrumb } from "@/components/ui";
import { ProjectForm } from "@/components/ProjectForm";

export const metadata = { title: "Post a project" };

export default async function NewProjectPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/projects/new");

  if (!canCreateProject(user)) {
    return (
      <div className="mx-auto w-full max-w-[560px] px-4 sm:px-8 py-20 text-center">
        <h1 className="font-serif text-[28px] font-medium">You need posting rights first</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-3">
          Posting a project means taking responsibility for other people&apos;s time, so an admin
          reviews each request.
        </p>
        <p className="mt-5">
          <Link href="/request-posting-rights">Request posting rights →</Link>
        </p>
      </div>
    );
  }

  const workshops = await db.workshop.findMany({
    select: { id: true, title: true },
    orderBy: { startDate: "desc" },
  });

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 sm:px-8 pb-24 pt-7">
      <Breadcrumb href="/" label="Discover" current="New project" />
      <h1 className="font-serif text-[32px] font-medium">Post a research project</h1>
      <p className="mb-9 mt-1.5 max-w-[62ch] text-[15px] leading-relaxed text-ink-3 pretty">
        The projects that attract good contributors are specific about three things: what question
        you&apos;re answering, what a contributor would actually do on a Tuesday evening, and how
        credit will be assigned.
        {user.role !== "ADMIN"
          ? " An admin reviews each submission before it appears publicly — usually quickly."
          : ""}
      </p>
      <ProjectForm workshops={workshops} mode="create" requiresApproval={user.role !== "ADMIN"} />
    </div>
  );
}
