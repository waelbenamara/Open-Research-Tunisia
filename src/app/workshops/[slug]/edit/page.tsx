import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canManageWorkshop } from "@/lib/permissions";
import { parseList } from "@/lib/format";
import { Breadcrumb } from "@/components/ui";
import { WorkshopEditForm } from "./WorkshopEditForm";

export const metadata = { title: "Edit workshop" };

function isoDate(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default async function EditWorkshopPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/workshops/${slug}/edit`);

  const workshop = await db.workshop.findUnique({ where: { slug } });
  if (!workshop) notFound();
  if (!(await canManageWorkshop(workshop.facilitatorId, user))) redirect(`/workshops/${slug}`);

  return (
    <div className="mx-auto w-full max-w-[760px] px-8 pb-24 pt-7">
      <Breadcrumb href={`/workshops/${slug}`} label={workshop.title} current="Edit" />
      <h1 className="mb-8 font-serif text-[32px] font-medium">Edit workshop</h1>

      <WorkshopEditForm
        values={{
          id: workshop.id,
          title: workshop.title,
          summary: workshop.summary,
          about: workshop.about,
          level: workshop.level,
          outcomes: parseList(workshop.outcomes).join("\n"),
          prerequisites: workshop.prerequisites,
          startDate: isoDate(workshop.startDate),
          seats: workshop.seats,
          format: workshop.format,
          location: workshop.location ?? "",
          language: workshop.language,
          status: workshop.status,
          certificateEnabled: workshop.certificateEnabled,
          attendanceThreshold: workshop.attendanceThreshold,
        }}
      />

      <p className="mt-8 border-t border-line pt-5 text-[13px] text-ink-4">
        Sessions, attendance, materials and certificates are managed from the workshop page itself.
      </p>
    </div>
  );
}
