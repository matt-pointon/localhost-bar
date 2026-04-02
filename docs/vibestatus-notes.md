# Vibestatus Notes → Tasks/Todos — Feature Plan

## Status: PIVOTING

The initial "notes" feature has been built (single text note per project, written to AI config files). The user wants to **pivot to tasks/todos** instead — more structured, more useful.

## What was built (notes v1)

- Single text note per project (max 200 chars)
- Written into AI tool config files (CLAUDE.md, .cursorrules, etc.) with fenced markers
- Persisted in `{userData}/notes.json`
- Inline text input in ServiceRow, StickyNote icon button
- Config writer with `<!-- vibestatus:start/end -->` markers

### Existing code

- `src/main/notes/store.ts` — CRUD for notes in Electron userData
- `src/main/notes/config-writer.ts` — writes/clears fenced sections in AI config files
- `src/renderer/src/components/NoteInput.tsx` — inline text input component
- `src/renderer/src/hooks/useNotes.ts` — React hook for note state
- `src/renderer/src/components/ServiceRow.tsx` — has note display + edit wired in

### Config files written to

| Tool | Config file |
|------|------------|
| Claude Code | `CLAUDE.md` and `.claude/CLAUDE.md` |
| Cursor | `.cursorrules` |
| Windsurf | `.windsurfrules` |
| Copilot | `.github/copilot-instructions.md` |

## What the user wants instead: Tasks/Todos

> "Instead of notes - I'm thinking of maybe adding this feature as tasks or to dos that maybe get added to an accordion underneath the project. Keeping it simple UI wise and interaction wise - we should animate that it's been added. focusing on keeping it lightweight."

### Design direction

- **Accordion under each project** — expands to show task list, collapsed by default
- **Task = simple text + done/not-done** — no due dates, no priority, no assignees
- **Animated additions** — when a task is added, animate it into the list
- **Lightweight** — minimal UI, fast interactions, no modals
- **Still writes to AI config files** — the config-writer infrastructure can be reused, just format tasks as a checklist instead of a single note

### Proposed UX

1. Each ServiceRow gets a small expand/collapse chevron or task count badge
2. Clicking expands an accordion below the row showing the task list
3. An "Add task" input at the bottom of the accordion (similar to current NoteInput)
4. Tasks show as checkboxes — click to toggle done
5. Animate new tasks appearing (slide in or fade in)
6. Completed tasks can be dismissed or auto-hidden

### Config file format (proposed)

```markdown
<!-- vibestatus:start -->
<!-- DO NOT EDIT — managed by Localhost Bar -->

## Project Tasks

- [ ] Fix the auth flow — tokens expire silently after 24h
- [x] Set up CI pipeline
- [ ] Add error boundary to dashboard

### Context (auto-generated)
- Branch: feature/auth-refresh
- Uncommitted changes: 3
- Last commit: "add token refresh endpoint"
- Updated: 2026-04-01T14:30:00Z

<!-- vibestatus:end -->
```

### Implementation plan

1. **Extend store** — change `notes.json` schema from `{ text }` to `{ tasks: [{ id, text, done }] }` per cwd
2. **Update config-writer** — format tasks as markdown checklist instead of single note
3. **New TaskList component** — accordion with checkbox items + add input
4. **Animate** — CSS transitions for accordion expand/collapse and new task insertion
5. **Update ServiceRow** — replace note display with task accordion trigger
6. **Keep it backwards-compatible** — migrate any existing notes to single tasks on first load
