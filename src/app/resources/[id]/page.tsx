import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessResource } from "@/lib/resourceAccess";
import { fileExt, fileSize, shortDate, viewableKind } from "@/lib/format";
import { resolveDownload } from "@/lib/storage";
import { KIND_COLORS } from "@/lib/theme";
import { Breadcrumb, Card, KindBadge, Shell } from "@/components/ui";

export const metadata = { title: "Resource" };

const TEXT_PREVIEW_MAX = 400 * 1024; // bytes of text we'll render inline

/** Read a stored text file's content for preview, whatever the driver. */
async function readTextContent(filePath: string): Promise<string | null> {
  const resolved = await resolveDownload(filePath);
  if (!resolved) return null;
  if (resolved.kind === "buffer") {
    return resolved.body.subarray(0, TEXT_PREVIEW_MAX).toString("utf8");
  }
  const res = await fetch(resolved.url);
  if (!res.ok) return null;
  const text = await res.text();
  return text.slice(0, TEXT_PREVIEW_MAX);
}

/** Naive CSV split — fine for preview; quoted commas may mis-split. */
function csvRows(text: string, sep: string): string[][] {
  return text
    .split("\n")
    .filter((l) => l.trim() !== "")
    .slice(0, 200)
    .map((l) => l.split(sep).map((c) => c.trim().replace(/^"|"$/g, "")));
}

export default async function ResourceViewerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  const resource = await db.resource.findUnique({
    where: { id },
    include: {
      project: { select: { slug: true, title: true, approvalStatus: true } },
      workshop: { select: { slug: true, title: true } },
      meeting: { select: { title: true } },
      uploadedBy: { select: { name: true } },
    },
  });
  if (!resource) notFound();
  if (!(await canAccessResource(resource, user))) notFound();
  // Resources of not-yet-approved projects stay private to their team.
  if (
    resource.project &&
    resource.project.approvalStatus !== "APPROVED" &&
    user?.role !== "ADMIN" &&
    resource.uploadedById !== user?.id
  ) {
    notFound();
  }

  // Link-only resources have nothing to render — go straight to the link.
  if (!resource.filePath) {
    if (resource.url) redirect(resource.url);
    notFound();
  }

  const ext = fileExt(resource.filePath);
  const kind = viewableKind(ext);
  const [bg, fg] = KIND_COLORS[resource.kind] ?? KIND_COLORS.LINK;
  const inlineSrc = `/api/resources/${resource.id}/inline`;
  const downloadHref = `/api/resources/${resource.id}/download`;

  const parent = resource.project
    ? { href: `/projects/${resource.project.slug}?tab=resources`, label: resource.project.title }
    : resource.workshop
      ? { href: `/workshops/${resource.workshop.slug}`, label: resource.workshop.title }
      : { href: "/", label: "Discover" };

  const text = kind === "text" ? await readTextContent(resource.filePath) : null;
  const isTable = kind === "text" && (ext === "csv" || ext === "tsv") && text;

  return (
    <Shell className="pb-24 pt-7">
      <Breadcrumb href={parent.href} label={parent.label} current="Resource" />

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <KindBadge kind={resource.kind} bg={bg} fg={fg} />
        <div className="min-w-[240px] flex-1">
          <h1 className="font-serif text-[26px] font-medium leading-tight">{resource.title}</h1>
          <div className="mt-1 text-[12.5px] text-muted">
            {[
              resource.version,
              resource.description,
              resource.meeting ? `attached to “${resource.meeting.title}”` : null,
              fileSize(resource.fileSize),
              `added ${shortDate(resource.createdAt)} by ${resource.uploadedBy.name}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
        <a
          href={downloadHref}
          className="border border-line-input bg-card px-4 py-2 text-[13px] font-semibold text-ink-4 no-underline hover:border-brick hover:text-brick hover:no-underline"
        >
          Download
        </a>
      </div>

      {kind === "presentation" ? (
        <div>
          {/* Sandboxed on both ends: the iframe attribute here, and the CSP
              header the inline route always sends for HTML. */}
          <iframe
            src={inlineSrc}
            title={resource.title}
            sandbox="allow-scripts"
            allowFullScreen
            className="aspect-video w-full border border-line bg-ink"
          />
          <div className="mt-2 flex items-center gap-4 text-[12.5px] text-muted">
            <span>Use ← → to move between slides.</span>
            <a href={inlineSrc} target="_blank" rel="noopener noreferrer" className="font-semibold">
              Present full screen ↗
            </a>
          </div>
        </div>
      ) : kind === "pdf" ? (
        <iframe
          src={inlineSrc}
          title={resource.title}
          className="h-[82vh] w-full border border-line bg-card"
        />
      ) : kind === "image" ? (
        <div className="border border-line bg-card p-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={inlineSrc} alt={resource.title} className="mx-auto max-h-[80vh] max-w-full" />
        </div>
      ) : kind === "video" ? (
        <video src={inlineSrc} controls className="max-h-[80vh] w-full border border-line bg-ink" />
      ) : kind === "audio" ? (
        <Card className="p-8">
          <audio src={inlineSrc} controls className="w-full" />
        </Card>
      ) : isTable ? (
        <div className="overflow-x-auto border border-line bg-card">
          <table className="w-full text-[13px]">
            <tbody>
              {csvRows(text!, ext === "tsv" ? "\t" : ",").map((row, i) => (
                <tr key={i} className={i === 0 ? "bg-sand font-semibold" : "border-t border-line-soft"}>
                  {row.map((cell, j) => (
                    <td key={j} className="whitespace-nowrap px-3 py-1.5">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-line px-3 py-2 text-[12px] text-muted">
            Preview of the first rows — download for the full file.
          </div>
        </div>
      ) : kind === "text" && text !== null ? (
        <pre className="max-h-[80vh] overflow-auto border border-line bg-card p-5 text-[13px] leading-[1.55]">
          {text}
        </pre>
      ) : (
        <Card className="p-10 text-center">
          <div className="font-serif text-[20px] font-medium">
            No in-browser preview for .{ext} files
          </div>
          <p className="mx-auto mt-2 max-w-[48ch] text-[13.5px] leading-relaxed text-ink-4">
            {["ppt", "pptx", "doc", "docx", "odt", "odp", "xls", "xlsx"].includes(ext)
              ? "Office formats can't be rendered by the browser. Download it — or ask the uploader for a PDF export, which views right here."
              : "Download the file to open it locally."}
          </p>
          <div className="mt-5">
            <a
              href={downloadHref}
              className="bg-brick px-5 py-2.5 text-[13.5px] font-semibold no-underline hover:bg-brick-dark hover:no-underline"
              style={{ color: "#faf8f3" }}
            >
              Download ({fileSize(resource.fileSize) || ext})
            </a>
          </div>
        </Card>
      )}

      <div className="mt-4 text-[12.5px] text-muted">
        <Link href={parent.href}>← Back to {parent.label}</Link>
      </div>
    </Shell>
  );
}
