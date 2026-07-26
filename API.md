# Open Research Tunisia — HTTP API (v1)

A RESTful API for driving the platform programmatically — from scripts or AI
agents. Full, always-current reference with examples lives in-app at
**`/developers`**. This file is the quick reference.

## Authentication

Create a key at **`/settings/api-keys`** (shown once). Send it as a Bearer token:

```bash
curl https://openresearchtunisia.org/api/v1/me \
  -H "Authorization: Bearer ort_your_key"
```

A key **acts as its owner** with their permissions. Only the SHA-256 hash is
stored; the raw `ort_…` token is shown once. Revoke anytime.

**Scopes:** `read` (list/fetch) and `write` (create/update). Choose per key.

**Response shape:** success → `{ "data": … }`; error →
`{ "error": { "code", "message" } }` with a standard status
(`401` auth · `403` scope/permission · `404` · `422` validation · `500`).

## Endpoints (base: `/api/v1`)

| Method | Path | Scope | Purpose |
|---|---|---|---|
| GET | `/me` | read | Authenticated user + scopes |
| GET | `/projects` | read | List projects (`?mine` `?recruiting` `?q` `?limit`) |
| POST | `/projects` | write | Create a project (needs posting rights; non-admins → pending) |
| GET | `/projects/{id_or_slug}` | read | Fetch a project |
| PATCH | `/projects/{id_or_slug}` | write | Update (managers) |
| GET | `/projects/{id}/tasks` | read | Task board (members) |
| POST | `/projects/{id}/tasks` | write | Add a task (`assign_self`, or manager fields) |
| PATCH | `/tasks/{id}` | write | Move status / reassign (DONE = manager only) |
| GET | `/workshops` | read | List workshops |

## Example

```js
const BASE = "https://openresearchtunisia.org/api/v1";
async function api(path, method = "GET", body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: `Bearer ${process.env.ORT_API_KEY}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j.error?.message ?? res.statusText);
  return j.data;
}

const project = await api("/projects", "POST", {
  title: "Automated literature triage",
  summary: "An agent that triages new preprints against our inclusion criteria.",
  area: "Computer science",
});
await api(`/projects/${project.id}/tasks`, "POST", { title: "Draft the checklist", assign_self: true });
```

Field names, request bodies, and per-endpoint details: **`/developers`**.
