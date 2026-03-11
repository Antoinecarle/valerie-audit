# Valerie

## Project Rules

<!-- Add project-specific instructions here -->

<!-- ARCHONSE:GLOBAL_RULES:START -->
<!-- Auto-propagated from root CLAUDE.md — DO NOT EDIT this section manually -->

## Global Rules (Archonse Platform)

## Database Rules

### PostgreSQL on Railway — ALWAYS
- **NEVER use SQLite**. All data goes to Railway PostgreSQL.
- Connection: use `DATABASE_PUBLIC_URL` from `.env`
- Use `pg` Pool with connection pooling (max 20 connections)
- All queries use **parameterized statements** ($1, $2...) — NEVER string interpolation
- UUIDs for all primary keys (uuid_generate_v4())
- Timestamps always TIMESTAMPTZ (with timezone)
- JSONB for flexible/nested data (labels, metadata, settings, etc.)

### Dual Storage Pattern (DB + Files)
Projects are stored in **BOTH** places:
1. **Database** (`projects` table): metadata, settings, members, category, status
2. **Filesystem** (`/root/archonse/ProjectList/{slug}/`): actual project files, git repos

**On project creation:**
1. INSERT into `projects` table with slug, name, description, owner_id
2. `mkdir -p /root/archonse/ProjectList/{slug}`
3. If git URL provided: `git clone {url} /root/archonse/ProjectList/{slug}`

**On project deletion:**
1. DELETE from `projects` (CASCADE removes tasks, tickets, environments, etc.)
2. `rm -rf /root/archonse/ProjectList/{slug}`

### Schema (15 core tables)
See `server/db/schema.sql` for complete schema:
- `users` — Auth + profiles (roles: owner/admin/editor/viewer/member)
- `invitations` — Team invitations
- `projects` — Central entity, everything scoped to project
- `project_categories` — Organize projects
- `project_members` — Many-to-many user↔project
- `terminal_sessions` — PTY sessions (scoped to project)
- `session_shares` — Terminal sharing
- `tasks` — Kanban board items (5 columns)
- `task_comments` — Comments on tasks
- `client_tickets` — External client support tickets
- `environments` — Dev/Staging/Prod per project
- `deployments` — Deploy history with pipeline
- `knowledge_items` — Documents, specs, audio files
- `knowledge_artifacts` — AI-generated summaries/reports
- `mcp_connections` — MCP service integrations per project
- `agents` — AI agent definitions
- `agent_teams` — Agent groupings
- `agent_workflows` — Node-based workflows
- `project_agents` — Link agents to projects
- `roadmap_versions` — Version planning
- `roadmap_items` — Items in versions
- `activity_log` — All actions tracked
- `notifications` — User notifications
- `credentials` — Encrypted credential vault
- `project_messages` — Project chat
- `claude_sessions` — Claude Code sessions per project

---

## Security Rules

- **NEVER** store passwords in plain text — always bcryptjs hash
- **NEVER** interpolate user input into SQL — always parameterized queries
- **NEVER** expose DATABASE_URL to frontend
- All file paths resolved with `path.resolve()` — prevent directory traversal
- Project names validated: `/^[a-zA-Z0-9_.-]+$/`
- Credentials encrypted before storing in DB
- JWT verified on every request (middleware)
- Socket.IO connections authenticated via JWT in handshake
- Terminal PTY runs as non-root user (uid 1001)
- CLAUDE_* env vars stripped from terminal sessions

---

## Port Management
This VPS runs multiple projects. Always:
1. Check available ports: `ss -tlnp | grep LISTEN`
2. Use a port not already in use
3. Default backend: 3001
4. Frontend dev: Vite will auto-find available port
5. All services must use **alfredhub.io** domain — NEVER localhost

---

<!-- ARCHONSE:GLOBAL_RULES:END -->
