import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { CodeBrowser } from "./CodeBrowser";

export default async function CodeProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) redirect(`/login?next=/code/${id}`);

  const project = await db.codeProject.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      sourceUrl: true,
      sourceRef: true,
      commitSha: true,
      truncated: true,
      fileCount: true,
      workshop: { select: { slug: true, title: true } },
      files: { select: { id: true, path: true, size: true, binary: true }, orderBy: { path: "asc" } },
    },
  });
  if (!project) notFound();

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-8">
      <div className="mb-4">
        {project.workshop ? (
          <Link href={`/workshops/${project.workshop.slug}`} className="text-[13px] text-brick">
            ← {project.workshop.title}
          </Link>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-serif text-[26px] font-medium leading-tight">{project.title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted">
              {project.sourceUrl ? (
                <a href={project.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-brick">
                  {project.sourceUrl.replace("https://github.com/", "")}
                </a>
              ) : null}
              {project.sourceRef ? <span>· {project.sourceRef}</span> : null}
              {project.commitSha ? <span>· {project.commitSha.slice(0, 7)}</span> : null}
              <span>· {project.fileCount} files</span>
              {project.truncated ? (
                <span className="text-gold-dark">· large repo — some files omitted</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <CodeBrowser projectId={project.id} files={project.files} />
    </div>
  );
}
