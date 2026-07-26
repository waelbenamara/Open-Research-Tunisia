import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canCreateProject } from "@/lib/permissions";
import { Breadcrumb } from "@/components/ui";
import { WorkshopForm } from "./WorkshopForm";

export const metadata = { title: "Run a workshop" };

export default async function NewWorkshopPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/workshops/new");

  if (!canCreateProject(user)) {
    return (
      <div className="mx-auto w-full max-w-[560px] px-4 sm:px-8 py-20 text-center">
        <h1 className="font-serif text-[28px] font-medium">You need posting rights first</h1>
        <p className="mt-5">
          <Link href="/request-posting-rights">Request posting rights →</Link>
        </p>
      </div>
    );
  }

  const projects = await db.project.findMany({
    where: { archived: false, approvalStatus: "APPROVED" },
    select: { id: true, title: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 sm:px-8 pb-24 pt-7">
      <Breadcrumb href="/" label="Discover" current="New workshop" />
      <h1 className="font-serif text-[32px] font-medium">Run a workshop</h1>
      <p className="mb-9 mt-1.5 max-w-[62ch] text-[15px] leading-relaxed text-ink-3 pretty">
        Workshops exist to remove the specific blockers stopping people from joining projects. Link
        yours to a project and the skills learned feed straight into real research.
      </p>
      <WorkshopForm projects={projects} />
    </div>
  );
}
