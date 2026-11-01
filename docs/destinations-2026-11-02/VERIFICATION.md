# Workspace destinations verification — 2 November 2026

Approved batch applied on main after navigator release965b459. No backend/schema change.

## Behavior

- Folder breadcrumb sits above its title. Box/List/Details/Cards use local icon controls; creation, links, sorting/filtering, Properties and pane actions use one menu.
- Box is a borderless icon grid, List compact rows, Details a Name/Type/Updated table, Cards real metadata and cached plain-text excerpts. Folder Updated shows a dash because the API does not supply a folder update time.
- Open-destination tabs reuse Calendar, Plan and each collection identity. Folder navigation reuses a browsing tab. Tabs retain order, scope/date/presentation and Book page selection across switching/reload. Explicit side-by-side panes and Freeze are retained. Keyboard arrows navigate tabs; Alt+arrows or the tab-order menu reorder them.
- Sidebar provides workspace Calendar/Plan and a searchable collection library. Multiple independently named Books, Canvases, Boards and Study sets share the existing reference-preserving API.
- Calendar has Grid/Agenda and a single date-navigation row. The grid scrolls horizontally when narrow; Agenda is explicitly selectable. Plan uses compact groups with Unplanned and retains broad intentions and original dates.
- Properties opens explicitly, defaults to360px and saves its own width. Visible context switches keep their current width; closing Properties and opening a note restores the editor width. Name Save/Discard appears only for edits. Draft/conflict guards retain changes.

## Checks

Production frontend build, TypeScript, focused ESLint, pane/layout/destination unit checks and four agenda regressions pass. Build retains pre-existing restricted-import warnings elsewhere.

147 completed browser checkpoints:27 workspace flows,83 responsive checks,14 touch/context checks,17 collection checks and6 exam checks. Light/dark, Panels/Cards,320/390/1024/1912/3840px; emulated Chromium touch, not physical-device certification. Screenshots inspected; no page JavaScript errors.

Real flows include local creation of two independent collections of each kind; original note editing and propagation; cross-folder move preserving date/time; conflict/retry; collection move/duplicate/unlink; saved tabs/pages; Freeze and explicit panes; Properties resize/reload and note-width recovery; actual mobile exam answers, submission and reload. Intentional409 response verifies draft retention. All mutations use the disposable local QA database; production smoke is read-only.

Evidence: checks.json and representative PNGs alongside this file. Harnesses under /tmp/airunote-destinations-{smoke,responsive,touch,collections,exam}.cjs. API4321 and production preview4320. Existing unrelated instruction edits and older QA directories are preserved.

## Release

Commit/push and provider verification recorded in the shared dated handoff after deployment. A Git push alone is not deployment confirmation. Backend remains the previously verified collection API4e4436b, since this batch is frontend-only.
