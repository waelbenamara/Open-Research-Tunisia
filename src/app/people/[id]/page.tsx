import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ProfileView } from "@/components/ProfileView";
import { Breadcrumb, Shell } from "@/components/ui";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await db.user.findUnique({ where: { id }, select: { name: true, headline: true } });
  return user ? { title: user.name, description: user.headline ?? undefined } : {};
}

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [exists, me] = await Promise.all([
    db.user.findUnique({ where: { id }, select: { id: true } }),
    getCurrentUser(),
  ]);
  if (!exists) notFound();

  return (
    <Shell className="pb-24 pt-7">
      <Breadcrumb href="/people" label="People" current="Profile" />
      <ProfileView userId={id} isOwner={me?.id === id} />
    </Shell>
  );
}
