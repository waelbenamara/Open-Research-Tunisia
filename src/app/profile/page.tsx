import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ProfileView } from "@/components/ProfileView";
import { Shell } from "@/components/ui";

export const metadata = { title: "My profile" };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/profile");

  return (
    <Shell className="pb-24 pt-11">
      <ProfileView userId={user.id} isOwner />
    </Shell>
  );
}
