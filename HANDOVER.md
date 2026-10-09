# Airunote Landing Page Handover

Last updated: 2026-09-27

## Purpose

The landing page has been redesigned around product proof and conversion.

Core positioning:

- One connected knowledge system.
- Work starts private and is shared deliberately.
- The same content can take different shapes without duplication.
- Airunote supports personal work, teams, publishing, assessments, inquiries, applications, surveys, and onboarding.
- Visitors should understand the product through realistic, interactive interfaces rather than generic feature cards.

The hero and top portion of the page are approved. Do not redesign them unless explicitly requested.

## Current Page Structure

1. Hero
2. Reassurance strip
3. Four-chapter navigation rail
4. Interactive Living Lens demo
5. Publishing and outcomes section
6. Privacy, sharing, and collaboration section
7. FAQ and registration CTA
8. Footer

The chapter rail communicates:

1. Shape your work
2. Publish outcomes
3. Own and collaborate
4. Start

## Reassurance Strip

The strip below the hero communicates:

- Start free — No credit card
- Private by default — Yours from the start
- One note, 13 ways to work — Board, Canvas, Study, and more

The three statements use distinct icon colors and card treatments.

## Living Lens Demo

Key copy:

- Eyebrow: `One note. Thirteen ways to work.`
- Headline: `Your work. From every angle.`
- Visitors are invited to try Board, Canvas, and Study.
- Badge: `Try it live · no signup`

The section uses a warm cork/wood-inspired treatment as a deliberate visual reset from the blue sections.

The demo:

- Uses browser-only seed data.
- Does not persist changes or mutate the backend.
- Can be reset.
- Lets visitors edit notes.
- Lets visitors move notes between Board stages.
- Lets visitors drag notes spatially on Canvas.
- Lets visitors switch between Board, Canvas, and Study.
- Preserves edits while changing views.
- Communicates: `Same note. New lens. Nothing duplicated.`

Use this browser-local behavior for other landing-page product demonstrations unless requirements explicitly change.

Desktop includes a product capability rail for:

- Drag and arrange
- Edit in place
- Export to PDF
- Explore 13 workspace types

Mobile replaces the desktop rail with compact `How it works` and `13 types` controls.

The 13 workspace types currently shown are:

- Box
- Book
- Board
- Project
- Pipeline
- Ledger
- Wiki
- Notebook
- Journal
- Contacts
- Canvas
- Manual
- Collection

### Terminology to confirm

Board, Canvas, and Study are presented as live lenses or examples, while the explorer lists 13 workspace types. Study is not currently one of those 13 types. Preserve the distinction or revise the taxonomy and copy together to avoid confusion.

## Publishing and Outcomes

Heading: `Turn what you know into what comes next.`

Visitors can switch between seven purpose-built publishing journeys. Every mode has its own four-step journey, builder, public participant experience, questions, settings, metrics, reports, respondents, statuses, and audience labels.

### Exam

- Scenario: Cell Biology — Midterm
- Good for: Teachers, tutors, students
- Timed and graded
- Includes scorebook, answer matrix, item analysis, class results, and realistic students

### Quiz

- Scenario: Café Food-Safety Quiz
- Good for: Cafeterias, trainers, new hires
- Includes SOP-based questions, shift readiness, completion data, and training gaps

### Survey

- Scenario: Clinic Visit Experience
- Good for: Clinics, cafeterias, local businesses
- Includes service clarity questions, response trends, comments, completion rates, and recent visits

### Inquiry

- Scenario: New Patient Inquiry
- Good for: Clinics, consultancies, service teams
- Includes service selection, contact details, request routing, booking status, and inquiry queue

### Feedback

- Scenario: School Lunch Feedback
- Good for: Students, cafeterias, campus teams
- Includes menu feedback, open comments, top requests, meal breakdown, and actionable responses

### Application

- Scenario: Front-of-House Team Application
- Good for: Job posts, hiring teams, volunteer programs
- Includes availability, experience, candidate comparison, shortlist, and interview pipeline

### Knowledge Check

- Scenario: Clinic Onboarding Check
- Good for: Onboarding, clinics, certification teams
- Includes privacy and safety questions, readiness, retries, completion, and onboarding status

Cards use flexible minimum heights so longer journeys do not clip on desktop or mobile.

## Privacy and Collaboration

Heading: `Private from the start. Powerful when shared.`

This section is intentionally not tabbed. All three promises and their supporting product interfaces are always visible.

### 01 · Personal — Private by default

- Every workspace begins private.
- The `Only you` state is visible.
- Includes a private workspace and folder interface.
- Reinforces that there is no accidental sharing.

### 02 · Permissioned — Share deliberately

- Shows owner, editor, and viewer permissions.
- Reinforces that ownership does not change.
- Shows inviting only the people required.

### 03 · Collaborative — Built for teams

- Shows personal and team workspaces separately.
- Includes a team invitation code.
- Shows Admin, Member, and Viewer roles.
- Reinforces boundaries between personal and team work.

The cards appear side by side on desktop and stack on mobile.

## Registration CTA

The final CTA is `Build the workspace your work deserves.`

Current behavior:

1. The visitor enters an email.
2. The form redirects to `/register?email=<encoded-email>`.
3. The Register page owns the actual verification-code process.

The landing-page form does not call the registration API or send the verification code directly. Inline registration would be a separate future change.

## Main Files

Landing-page work:

- `frontend/components/landing/AirunoteLandingPage.tsx`
- `frontend/components/landing/LivingLensPlayground.tsx`

Backend development-startup improvements:

- `backend-node/src/dev.ts`
- `backend-node/src/index.ts`

Preserve existing work and avoid destructive Git operations when continuing.

## Backend Development Behavior

`backend-node/src/dev.ts` now:

- Loads `backend-node/.env`.
- Produces a clear error when `.env` is missing.
- Requires `DATABASE_URL`.
- Validates the `postgres://` or `postgresql://` protocol.
- Reads `PORT` or `API_PORT`, defaulting to port 4000.
- Detects an already-running Airunote API and reuses it instead of starting a duplicate server.

`backend-node/src/index.ts` now:

- Handles listen errors explicitly.
- Provides a clear `EADDRINUSE` message.
- Explains whether to keep the existing server, stop the conflicting process, or change `API_PORT`.

To run the backend locally:

1. Copy `backend-node/.env.example` to `backend-node/.env`.
2. Configure the database connection.
3. Run `pnpm dev` inside `backend-node`.

If port 4000 already contains the Airunote API, the development launcher should reuse it.

## Validation Completed

The following checks passed during implementation:

- TypeScript: `tsc --noEmit -p .\frontend\tsconfig.json`
- Next.js production build
- `git diff --check`
- Desktop responsive QA at 1440 × 1000
- Mobile responsive QA at 390 × 844
- All seven publishing modes
- Audience changes for every publishing mode
- No publishing-card clipping
- No trust-card clipping
- No horizontal page overflow
- No browser runtime errors during final checks

Known non-blocking local warnings:

- Restricted direct API imports in unrelated dashboard files
- UploadThing token and secret not configured during local builds
- `NEXT_PUBLIC_API_BASE_URL` falls back to `http://localhost:4000/api`
- Google Inter may use its fallback locally when external font access is blocked
- Git may report LF-to-CRLF warnings on Windows

## Recommended Next Decisions

1. Decide whether the email CTA should continue redirecting to Register or become true inline registration.
2. Confirm the taxonomy between the 13 workspace types and the Board, Canvas, and Study lenses.
3. Add conversion analytics for demo edits, lens switches, workspace-explorer opens, publishing-mode switches, and email CTA submissions.
4. Run a final content polish after the product terminology is locked.
5. Commit the landing-page, live-demo, handover, and backend development changes in clearly scoped commits.

## Exam Appearance and Native Files — 2026-10-10

Org-admin appearance editing, reusable templates/defaults, built-in asset selection, and native file management are implemented. The existing Autumn design is captured as migration data. Exams and attempts retain independent appearance snapshots; template changes are explicit. Built-ins include the existing Starbucks SVG and cats PNG, with no upload-storage dependency.

See [docs/exam-appearance.md](./docs/exam-appearance.md) for migration order, storage configuration, validation, and rollout limits. Run the dedicated appearance migration before deploying the backend. Production appearance migration completed on 2026-10-10 after a Neon recovery snapshot; frontend and backend are live on commit `c413f95`. All 4 exams, 27 attempts, and 360 answers were retained. Production uploads default to disabled (`FILE_UPLOADS_ENABLED`); bundled assets remain available. Public production smoke checks and visual parity passed. The signed-in production admin check awaits user login. The Wrapped In Joy template/exam remains the next product step.
