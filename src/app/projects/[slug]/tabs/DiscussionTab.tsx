import { EmptyState } from "@/components/ui";
import { DiscussionPanel } from "@/components/DiscussionPanel";
import type { ProjectAccess } from "@/lib/permissions";

export async function DiscussionTab({
  projectId,
  access,
}: {
  projectId: string;
  access: ProjectAccess;
  slug: string;
}) {
  if (!access.canSeeInternal) {
    return (
      <EmptyState
        title="The discussion is for project members."
        hint="Apply to contribute to join the conversation."
      />
    );
  }

  return <DiscussionPanel projectId={projectId} composerPlaceholder="Write a message to the project…  @ to mention" />;
}
