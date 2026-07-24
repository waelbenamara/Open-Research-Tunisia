import { shortDate } from "@/lib/format";
import { PROJECT_STAGES } from "@/lib/enums";
import { postAnnouncementAction, setProjectStageAction } from "@/actions/projects";
import { Card, EmptyState, SectionLabel } from "@/components/ui";
import { Details } from "@/components/Collapse";
import type { ProjectAccess } from "@/lib/permissions";

type Props = {
  project: {
    id: string;
    about: string;
    stage: string;
    announcements: { id: string; body: string; createdAt: Date; author: { name: string } }[];
  };
  stageIdx: number;
  access: ProjectAccess;
  tags: string[];
};

export function OverviewTab({ project, stageIdx, access }: Props) {
  return (
    <div className="flex flex-col gap-9">
      <div>
        <SectionLabel>Project stage</SectionLabel>
        <div className="flex items-center overflow-x-auto pb-1">
          {PROJECT_STAGES.map((label, i) => {
            const done = i < stageIdx;
            const current = i === stageIdx;
            return (
              <div key={label} className="flex flex-1 items-center">
                <div className="flex min-w-[76px] flex-col items-center gap-2">
                  <div
                    className="box-border h-3.5 w-3.5 rounded-full border-2"
                    style={{
                      background: done ? "#8a3325" : current ? "#fffefb" : "#efe9dc",
                      borderColor: i <= stageIdx ? "#8a3325" : "#ddd5c4",
                    }}
                  />
                  <div
                    className="whitespace-nowrap text-[11.5px]"
                    style={{ color: current ? "#211d16" : "#9a927f", fontWeight: current ? 600 : 400 }}
                  >
                    {label}
                  </div>
                </div>
                {i < PROJECT_STAGES.length - 1 ? (
                  <div
                    className="mx-1 mb-[22px] h-0.5 flex-1"
                    style={{ background: done ? "#8a3325" : "#e6dfd0" }}
                  />
                ) : null}
              </div>
            );
          })}
        </div>

        {access.canManage ? (
          <form action={setProjectStageAction} className="mt-4 flex items-center gap-2.5">
            <input type="hidden" name="projectId" value={project.id} />
            <span className="text-[12.5px] text-muted">Advance stage:</span>
            <select name="stage" defaultValue={project.stage} className="!w-auto !py-1.5 !text-[13px]">
              {[...PROJECT_STAGES, "OnHold", "Archived"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="cursor-pointer border border-line-input bg-card px-3.5 py-1.5 text-[12.5px] font-semibold text-ink-4 hover:border-brick hover:text-brick"
            >
              Update
            </button>
          </form>
        ) : null}
      </div>

      <div>
        <SectionLabel>About this project</SectionLabel>
        <div className="whitespace-pre-line text-[15px] leading-[1.75] text-ink-2 pretty">
          {project.about || "No description yet."}
        </div>
      </div>

      <div>
        <SectionLabel>Announcements</SectionLabel>

        {access.canManage ? (
          <Details label="+ Post an announcement">
            <form action={postAnnouncementAction} className="flex flex-col gap-3">
              <input type="hidden" name="projectId" value={project.id} />
              <textarea
                name="body"
                rows={3}
                required
                placeholder="What should the team and prospective contributors know?"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="cursor-pointer border-none bg-brick px-5 py-2.5 text-[13px] font-semibold"
                  style={{ color: "#faf8f3" }}
                >
                  Post announcement
                </button>
              </div>
            </form>
          </Details>
        ) : null}

        <div className="flex flex-col gap-3">
          {project.announcements.length === 0 ? (
            <EmptyState title="No announcements yet." />
          ) : (
            project.announcements.map((a) => (
              <Card key={a.id} className="flex items-baseline gap-4 px-5 py-4">
                <div className="min-w-[56px] text-[12px] font-semibold text-muted">
                  {shortDate(a.createdAt)}
                </div>
                <div className="flex-1">
                  <div className="text-[14px] leading-[1.55] text-ink-2">{a.body}</div>
                  <div className="mt-1 text-[12px] text-muted">{a.author.name}</div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
