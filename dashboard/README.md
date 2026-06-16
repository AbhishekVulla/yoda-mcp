# Yoda Care Dashboard

The **caregiver** side of Yoda. A live, read/write view of one senior (Mdm Tan) that reflects what
Yoda has arranged and lets the caregiver **approve or decline** each request.

- **Needs your approval** — pending activity requests Yoda raised (`request_activity`), with
  **Approve & book** / **Decline**. Yoda never books directly; the human decides here.
- **Arranged by Yoda** — confirmed activities (approved requests).
- Polls the shared **Neon** database every 3s, so a new request appears within seconds.

Stack: Next.js (App Router) + Tailwind v4, `@neondatabase/serverless`, SWR. Warm "care journal" UI
(Fraunces + Hanken Grotesk).

## Run

```bash
npm install
# .env.local:  DATABASE_URL=postgresql://...   (the SAME Neon DB the MCP server uses)
npm run dev        # http://localhost:3000
```

## Key files

```
app/care-dashboard.tsx     # the live UI (client, SWR poll)
app/api/profile/route.ts   # GET — profile + requests (what the page polls)
app/api/requests/route.ts  # POST — approve / decline a request
lib/db.ts                  # Neon queries: getProfile, listRequests, decideRequest
```

This is part of the **Yoda monorepo** — see the [root README](../README.md) for the full two-sided
architecture (necklace → xiaozhi cloud → MCP server → Neon ← this dashboard) and the MCP server setup.
