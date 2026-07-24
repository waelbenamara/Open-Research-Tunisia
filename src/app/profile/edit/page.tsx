import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { avatarSrc, parseList } from "@/lib/format";
import { Breadcrumb, Shell } from "@/components/ui";
import { ProfileEditForm } from "./ProfileEditForm";

export const metadata = { title: "Edit profile" };

export default async function EditProfilePage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login?next=/profile/edit");

  const user = await db.user.findUnique({ where: { id: session.id } });
  if (!user) redirect("/login");

  return (
    <div className="mx-auto w-full max-w-[720px] px-8 pb-24 pt-7">
      <Breadcrumb href="/profile" label="My profile" current="Edit" />
      <h1 className="font-serif text-[30px] font-medium">Edit profile</h1>
      <p className="mb-8 mt-1.5 max-w-[60ch] text-[14px] leading-relaxed text-ink-4 pretty">
        Project leads search this directory by skill. A specific profile — &ldquo;pandas, survey
        design, Derja transcription&rdquo; — gets you invited onto projects far more often than a
        vague one.
      </p>
      <ProfileEditForm
        avatar={{ src: avatarSrc(user), color: user.avatarColor, hasUpload: !!user.avatarPath }}
        user={{
          name: user.name,
          headline: user.headline ?? "",
          affiliation: user.affiliation ?? "",
          city: user.city ?? "",
          bio: user.bio ?? "",
          skills: parseList(user.skills).join(", "),
          languages: parseList(user.languages).join(", "),
          orcid: user.orcid ?? "",
          website: user.website ?? "",
          scholar: user.scholar ?? "",
          github: user.github ?? "",
        }}
      />
    </div>
  );
}
