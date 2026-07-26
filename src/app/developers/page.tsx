import Link from "next/link";
import { Shell } from "@/components/ui";

export const metadata = {
  title: "Developer API",
  description: "Automate Open Research Tunisia — create projects and tasks programmatically.",
};

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto border border-line bg-sand px-4 py-3.5 text-[12.5px] leading-[1.6] text-ink-2">
      <code className="font-mono">{children}</code>
    </pre>
  );
}

function Endpoint({
  method,
  path,
  scope,
  children,
}: {
  method: string;
  path: string;
  scope: "read" | "write";
  children: React.ReactNode;
}) {
  const color = method === "GET" ? "#4d6b3c" : method === "POST" ? "#8a3325" : "#7a5b16";
  return (
    <div className="border-t border-line py-6">
      <div className="flex flex-wrap items-center gap-2.5">
        <span
          className="px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-paper"
          style={{ background: color, color: "#faf8f3" }}
        >
          {method}
        </span>
        <code className="font-mono text-[13.5px] font-semibold text-ink">{path}</code>
        <span className="text-[11px] uppercase tracking-wide text-muted">· {scope} scope</span>
      </div>
      <div className="mt-3 flex flex-col gap-3 text-[13.5px] leading-relaxed text-ink-3">
        {children}
      </div>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 pt-12">
      <h2 className="font-serif text-[24px] font-medium text-ink">{title}</h2>
      <div className="mt-3 flex flex-col gap-3 text-[14.5px] leading-[1.7] text-ink-3">{children}</div>
    </section>
  );
}

export default function DevelopersPage() {
  const TOC = [
    ["auth", "Authentication"],
    ["scopes", "Scopes"],
    ["errors", "Errors"],
    ["me", "Identity"],
    ["projects", "Projects"],
    ["tasks", "Tasks"],
    ["workshops", "Workshops"],
    ["agent", "Connecting an agent"],
  ];

  return (
    <Shell className="pb-28 pt-11">
      <div className="grid gap-12 lg:grid-cols-[200px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-[90px] flex flex-col gap-1.5">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
              On this page
            </div>
            {TOC.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="text-[13px] text-ink-4 no-underline hover:text-brick">
                {label}
              </a>
            ))}
          </div>
        </aside>

        <div className="min-w-0 max-w-[760px]">
          <div className="eyebrow mb-2" style={{ color: "#8a3325" }}>
            Developer API · v1
          </div>
          <h1 className="font-serif text-[38px] font-medium leading-[1.1] balance">
            Automate everything, programmatically.
          </h1>
          <p className="mt-4 text-[16px] leading-[1.7] text-ink-3 pretty">
            A simple, RESTful HTTP API lets you drive Open Research Tunisia from your own code or an
            AI agent — list and create projects, manage tasks, and more. Every request authenticates
            with a personal API key and acts as you, with your exact permissions. Create a key on the{" "}
            <Link href="/settings/api-keys">API keys page</Link>.
          </p>

          <Section id="auth" title="Authentication">
            <p>
              Send your key as a Bearer token in the <code>Authorization</code> header. The base URL
              is your site&apos;s origin; all endpoints live under <code>/api/v1</code>. Bodies and
              responses are JSON.
            </p>
            <Code>{`curl https://openresearchtunisia.org/api/v1/me \\
  -H "Authorization: Bearer ort_your_key_here"`}</Code>
            <p>A successful response wraps data in a <code>data</code> field:</p>
            <Code>{`{ "data": { "id": "…", "title": "…", … } }`}</Code>
          </Section>

          <Section id="scopes" title="Scopes">
            <p>
              Each key has scopes. A <strong>read</strong> key can list and fetch; a{" "}
              <strong>read + write</strong> key can also create and update. Give an agent a read-only
              key unless it needs to make changes. You choose the scope when creating the key.
            </p>
          </Section>

          <Section id="errors" title="Errors">
            <p>Errors use standard HTTP status codes and a consistent JSON shape:</p>
            <Code>{`{ "error": { "code": "forbidden", "message": "You can't manage this project." } }`}</Code>
            <p className="text-[13.5px] text-ink-4">
              <code>401</code> missing/invalid key · <code>403</code> insufficient scope or
              permission · <code>404</code> not found · <code>422</code> validation ·{" "}
              <code>500</code> server error.
            </p>
          </Section>

          <Section id="me" title="Identity">
            <Endpoint method="GET" path="/api/v1/me" scope="read">
              <p>Returns the authenticated user and the key&apos;s scopes.</p>
              <Code>{`{ "id":"…","name":"Ouael","role":"ADMIN","can_post_projects":true,"scopes":["read","write"] }`}</Code>
            </Endpoint>
          </Section>

          <Section id="projects" title="Projects">
            <Endpoint method="GET" path="/api/v1/projects" scope="read">
              <p>
                Lists approved public projects. Query params:{" "}
                <code>mine=true</code> (projects you lead or belong to), <code>recruiting=true</code>,{" "}
                <code>q=</code> (search), <code>limit=</code> (max 100).
              </p>
              <Code>{`curl "https://openresearchtunisia.org/api/v1/projects?recruiting=true" \\
  -H "Authorization: Bearer ort_…"`}</Code>
            </Endpoint>

            <Endpoint method="POST" path="/api/v1/projects" scope="write">
              <p>
                Creates a project (requires posting rights). Like the web app, non-admin projects
                start as <code>pending</code> until an admin approves them. You become the lead.
              </p>
              <Code>{`curl -X POST https://openresearchtunisia.org/api/v1/projects \\
  -H "Authorization: Bearer ort_…" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Forecasting Water Stress in the Medjerda Basin",
    "summary": "An open, reproducible model of seasonal water stress in the basin.",
    "area": "Environmental data science",
    "stage": "Recruiting",
    "tags": ["Climate", "GIS"],
    "openings": [{ "role": "Data analyst", "skills": "Python, pandas", "seats": 2 }]
  }'`}</Code>
              <p className="text-[13.5px] text-ink-4">
                Required: <code>title</code> (≥8 chars), <code>summary</code> (≥30), <code>area</code>.
                Optional: <code>about</code>, <code>stage</code>, <code>tags[]</code>,{" "}
                <code>language</code>, <code>commitment</code>, <code>ethics_status</code>,{" "}
                <code>license</code>, <code>data_statement</code>, <code>openings[]</code>.
              </p>
            </Endpoint>

            <Endpoint method="GET" path="/api/v1/projects/{id_or_slug}" scope="read">
              <p>Fetch one project by id or slug.</p>
            </Endpoint>

            <Endpoint method="PATCH" path="/api/v1/projects/{id_or_slug}" scope="write">
              <p>
                Update a project you manage. Accepts <code>title</code>, <code>summary</code>,{" "}
                <code>about</code>, <code>stage</code>, <code>tags[]</code>.
              </p>
            </Endpoint>
          </Section>

          <Section id="tasks" title="Tasks">
            <Endpoint method="GET" path="/api/v1/projects/{id}/tasks" scope="read">
              <p>The project&apos;s task board. You must be a member of the project.</p>
            </Endpoint>

            <Endpoint method="POST" path="/api/v1/projects/{id}/tasks" scope="write">
              <p>
                Add a task. Members may add a task and self-assign with{" "}
                <code>&quot;assign_self&quot;: true</code>. Managers may also set{" "}
                <code>assignee_id</code>, <code>credit_role</code>, and <code>good_first_task</code>.
              </p>
              <Code>{`curl -X POST https://openresearchtunisia.org/api/v1/projects/PROJECT_ID/tasks \\
  -H "Authorization: Bearer ort_…" -H "Content-Type: application/json" \\
  -d '{ "title": "Summarize the drought-index papers", "effort": "M", "assign_self": true }'`}</Code>
            </Endpoint>

            <Endpoint method="PATCH" path="/api/v1/tasks/{id}" scope="write">
              <p>
                Move a task through <code>OPEN → IN_PROGRESS → IN_REVIEW → DONE</code>, or reassign it
                (managers). Only a manager may confirm <code>DONE</code>, which records the
                contribution on the assignee&apos;s public ledger.
              </p>
              <Code>{`curl -X PATCH https://openresearchtunisia.org/api/v1/tasks/TASK_ID \\
  -H "Authorization: Bearer ort_…" -H "Content-Type: application/json" \\
  -d '{ "status": "IN_REVIEW" }'`}</Code>
            </Endpoint>
          </Section>

          <Section id="workshops" title="Workshops">
            <Endpoint method="GET" path="/api/v1/workshops" scope="read">
              <p>List public workshops. Query: <code>limit=</code> (max 100).</p>
            </Endpoint>
          </Section>

          <Section id="agent" title="Connecting an agent">
            <p>
              The API is designed to be agent-friendly: predictable JSON, one auth header, and stable
              field names. A minimal Node example:
            </p>
            <Code>{`const BASE = "https://openresearchtunisia.org/api/v1";
const KEY = process.env.ORT_API_KEY;

async function api(path, method = "GET", body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Authorization": "Bearer " + KEY,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? res.statusText);
  return json.data;
}

// Create a project, then add a task to it.
const project = await api("/projects", "POST", {
  title: "Automated literature triage",
  summary: "An agent that triages new preprints against our inclusion criteria.",
  area: "Computer science",
});
await api("/projects/" + project.id + "/tasks", "POST", {
  title: "Draft the inclusion checklist",
  assign_self: true,
});`}</Code>
            <p className="text-[13.5px] text-ink-4">
              Keep your key secret — treat it like a password. If it leaks, revoke it on the{" "}
              <Link href="/settings/api-keys">API keys page</Link> and issue a new one. Keys never
              expire but can be revoked at any time.
            </p>
          </Section>
        </div>
      </div>
    </Shell>
  );
}
