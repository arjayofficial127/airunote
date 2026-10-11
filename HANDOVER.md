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


## Local gift continuity work — 2026-10-11

User requested fast local implementation without tests, smoke checks, pushes, or deployment.

- Creator entry defaults to `Unwrap & Begin`; appearance settings offer `Read Instructions` and free text, plus a replay visibility toggle. The optional `giftOpening` contract field preserves old appearance documents.
- Removed the creator instructions heading `Before you begin`.
- Appearance preview offers fullscreen, mobile width, exit control, and Escape handling.
- The real instructions/form now emerge from the box mouth and expand to the viewport before settling into a full-width page. Original gift assets and closed presentation are preserved. Reduced motion skips the transition; opening does not start an attempt or timer.
- Development-only `/dev/appearance` provides an unsigned local editor. Its draft resets on refresh.
- Local backend `.env` contains all 26 values exported from the user's Render environment, including the live database. Never commit or print these values. Startup uses local process overrides for `NODE_ENV=development`, `PORT=4000`, `API_PORT=4000`, `FRONTEND_URL=http://localhost:3000`, `APP_URL=http://localhost:3000`, and `IS_EMAIL_LOGIN=false`, followed by `pnpm dev` inside `backend-node`.
- Local authenticated saves affect live data. No migrations or fixture writes were run against the live database for this work.
- Changes are implemented but deliberately untested at the user's request. User will review locally.

Gift follow-up: removed resize-triggered animation completion (preview iframe resize could skip the sequence). Lid, light, box, and real exam paper now share a 3.6-second opening timeline. The paper is clipped at the box mouth during its rise, clears the box, then expands into the page. Still untested per user instruction.


## Commit and push request — 2026-10-11

User authorized committing and pushing the accumulated local work. Sound is now an accessible speaker icon with a 44px target in a reserved trailing branding column; it no longer adds a text-pill row or overlaps the gift. Fullscreen and iPhone 18 demo mockup previews are available. Fixed local workspace redirection for signed-in users and initialized preview iframes that finish loading before hydration. Preview captures were requested and saved locally; generated output and environment credentials are excluded from the commit. Automated tests remain skipped at the user's request. Push does not by itself confirm production deployment.


## Schedule pages and gift helper copy — 2026-10-11

Local follow-up: upcoming/ended availability pages omit the exam description/instructions while retaining title, branding, schedule, countdown, and status. Gift opening now offers `Text below the button` (300 characters; blank hides it), stored in optional `giftOpening.helperText`. Default helper is `Your timer hasn’t started.` to avoid repeating the button label. Existing configuration remains compatible. No tests, production data edits, push, or deployment performed for this follow-up.


## Preview gallery — 2026-10-11

Local toolbar now orders the screen dropdown, fullscreen icon, phone/desktop toggle, and gallery toggle. Gallery hides the dropdown and renders all seven states horizontally in isolated frames. Phone mode uses the existing demo shell; desktop frames render at 1920 × 1080 before scaling. Controlled canvas supports drag pan, touch pinch, control/trackpad wheel zoom, keyboard +/-/0, zoom buttons, and Fit all. Gallery is a presentation canvas; use single-screen mode to interact with entry animation. No tests, push, or deployment for this local follow-up.

Gallery follow-up: added Fit one, centered on the nearest screen. A gesture capture surface now keeps pointer/wheel events out of embedded previews; touch pinch, WebKit gesture events, and wheel zoom are handled. Shift-wheel remains available for panning. Zoom scroll anchoring is applied with layout updates instead of queued stale offsets. Applied locally without tests.


Laptop gallery gesture follow-up: replaced scroll-offset positioning with a freely translated/scaled canvas. Gesture updates use refs and one animation frame, avoiding React/iframe rerenders. A fixed capture surface and document capture listeners handle Ctrl-wheel laptop pinch and WebKit gesture events; ordinary two-finger scrolling pans in both axes. Mouse left/middle drag and touch pinch share the same camera. Fit one and Fit all remain available. This supersedes the earlier scroll-anchoring implementation. Applied locally without tests; physical laptop gesture behavior remains unverified.


Question screen compact header — 2026-10-11: consolidated the duplicate title/status toolbar, decorative hero, timer, sound control, and progress into one compact card above the questions. Removed the repeated instructions and tall artwork from this active-question header. The solid progress fill reports answered questions against a contrasting track, with accessible progress values. Existing sync and schedule warnings remain available. Shared live/preview renderer updated locally; no tests run per user instruction.


Device volume follow-up: removed respondent mute controls from entry, questions, completion, and shared previews. Exam audio follows the admin availability setting and no longer reads the old local mute preference. Removed the obsolete default-mute editor setting; existing stored contracts remain compatible. Preview audio remains suppressed. Local changes only, no tests run.

Question header edge-to-edge follow-up: removed the outer top/side gutters and rounded card border from the active exam header. Its background now spans the full viewport width at the top; inner text retains readable padding, and the question section retains its gutters. Applied locally without tests.

Completion celebration follow-up: replaced the tall left-aligned completion card with a centered gift, inset success seal, “Beautifully done” headline, existing administrator thank-you copy, and a submission confirmation strip. Submitted answers are preserved inside an accessible native disclosure below the celebration. Retry remains secondary. Theme colors and decoration preferences retained; local implementation only, no tests run.

Completion copy follow-up: removed redundant “All done”; renamed retry to “Take another attempt” and show it only for non-preview attempts below the configured limit while availability is open. No tests run.

Completion text controls: optional completionEyebrow and completionTitle now persist through the shared appearance contract and have editable fields in the Completion editor section. Existing appearances default to “A little moment to celebrate” and “Beautifully done.” Removed the redundant completion subtitle. Existing message field retained. Applied locally without tests.

Exam context across screens: shared configured header label and exam title now appear on completion and terminal status cards, with the label added to the compact question header and replacing the generic scheduled-page label. Entry already carries both. No instructions added back to status pages. Applied locally without tests.

Terminal visual refinement: focus-protection warning now uses a red outlined triangle. Compact exam context labels use smaller type and tighter tracking, allowing the configured label to fit on one line where space permits while retaining wrapping for longer text. No tests run.

Mobile entry height refinement: reduced outer/card spacing and helper minimum height; gift stage scales with viewport height to reduce unnecessary vertical scrolling while retaining enlarged branding. Long custom text can still scroll naturally. No tests run.

Fullscreen behavior: toolbar now requests native fullscreen on the browser document, preserving the current editor/preview/gallery layout instead of expanding the preview into an overlay. Fullscreen state follows browser events. No tests run.

Fullscreen clarification: user wants the chat to remain visible. Replaced native browser fullscreen with an in-page expanded preview confined to the browser panel; Escape restores the embedded layout. This supersedes the native fullscreen change. No tests run.

Instructions preview: added a separate Instructions dropdown/gallery state that opens directly on the revealed instructions form without starting an attempt. Gallery now includes eight screens. Actual entry still uses the gift animation. No tests run.

## Instruction editing and production release — 2026-10-11

User explicitly approved publishing all accumulated changes to production. Added optional opening text/font, instruction heading, and a second instruction block with optional heading. Existing descriptions remain untouched; the local sample separates its headings/body into the new fields. Reduced instructions header height, added Your details/timer guidance, hid Previous on the first question, and softened question background artwork. Gallery supports separate Instructions state and Pan/Interact modes. All accumulated visual refinements are included. Production build passed (backend TypeScript and Next production compilation), with existing import/image warnings. No tests or browser smoke tests run per user instruction. No database migration is needed for the optional JSON appearance fields.

Opening text flourish option: added locally hosted Great Vibes calligraphy (Google Fonts, OFL license included), with a larger initial letter and room for swashes. Select Flourish in the opening-text font menu. Local only; no tests run.

Opening image text: added Text/Image lettering choice, selectable built-in Wrapped in Joy ribbon-W artwork, native library image selection, accessible alternative text and fallback to normal text on image failure. Asset references participate in existing org-file validation/resolution. Generated artwork and prompt are saved under frontend/public/exam-assets/creator. Local only; no tests run.

Ribbon wordmark default: new Creator appearance configurations and the local sample default to the ribbon-W image. Built-in ribbon lettering renders slightly smaller and bleeds left beyond the instruction gutter; other selected images retain standard alignment. Existing saved appearance settings are preserved. Local only, no tests run.


Holiday entry release — 2026-10-11: user approved publishing the locked design. Added independently layered embossed gift artwork, corrected green/ivory seal, photographic green wall/table backdrop and contact shadow, separate botanical corners with reduced-motion-aware twinkling lights, coffee cherries and individually placed pinecones. Opening lettering supports image presets and custom sizing. Paper reveal scale now follows gift width. Backend and isolated frontend production builds passed; tests skipped per prior request. Production deployment status is recorded separately.

Paper extraction follow-up — 2026-10-11: raised the box-mouth origin from 49% to 46.5% of the gift stage. During extraction the real panel uses a taller sheet height fitted to the space above the rim, and fully reveals before resizing to the viewport. Square clipped lower corners keep the emerging edge visually tucked into the box. Local only; tests skipped per existing user instruction.

Scheduled gift scenes — 2026-10-11: Upcoming and Ended now reuse CreatorEntryReveal artwork with a smaller stationary gift and prominent status. Upcoming displays the existing live countdown and scheduled date, retaining automatic schedule unlock; Ended shows a noninteractive Responses closed label and steady fairy lights. Outer outline ornaments remain. Non-Creator and hidden-artwork appearances retain their existing notice layout. Local only; no tests run per user preference.

Completion closing scene — 2026-10-11: Creator completion uses the green studio texture and warm glow, with the existing layered embossed gift slightly open around an ivory Thank you card. Submission confirmation is directly beneath the editable title; floating corner check removed. Existing editable message, outer ornaments, answer review and secondary retry remain. Mobile artwork is smaller, sparkles run once and respect reduced motion. Local only; tests skipped per user preference.

Instructions density — 2026-10-11: tightened revealed header padding/title on mobile, opening-lettering top space, instruction block gaps and divider padding, and form top padding. Body copy remains the same font size with 1.6 line height; all instructions remain visible. Local only, no tests run per user preference.

Compact entry — 2026-10-11: user approved one-screen target with expandable full instructions and optional identity details. Required email/identifier remain visible, optional fields remain controlled inside native disclosure. Reduced mobile header and lettering, sticky Start action, 100dvh minimum with natural overflow for expanded content and accessibility. Local only; no tests per user preference.

Red theme and visible fields — 2026-10-11: user rejected collapsed content. Removed instruction/optional-field disclosures; all copy and fields are always visible with natural scrolling. Applied generated cranberry ribbon body/lid/bow and corner variants, neutral evergreen backdrop and red invitation/status/start controls. Original assets preserved; animation layers and timelines retained. Local only, not published; no tests run per preference.

Shared top banner — 2026-10-11: added generated evergreen/red ribbon-W banner on Creator instructions, questions and completion. Branding, configured header label (Partner Knowledge Check Exam) and compact exam title are live overlays inside banner. Duration/question/attempt facts follow instructions before identity fields. Added optional banner image/alt contract with existing library upload selection, org-file reference validation and default reset. All instructions/fields remain visible. Syntax transpilation passed; browser tests skipped per user preference. Local only, not published. Asset and prompt: frontend/public/exam-assets/creator/holiday-banner.*.

Instructions grid and banner logo — 2026-10-11: unified Creator instructions, exam facts and identity form into a shared 880px column with responsive 20–32px gutters. Copy, dividers, chips, fields and Start action now use the same horizontal grid and consistent section spacing. All instructions and optional fields remain visible; banner stays full-width. Built-in banner logo uses green mask on ivory circular backing for contrast; custom logos retained. Diff whitespace check passed; no browser/tests run per existing preference. Local only, not published.

Question status strip — 2026-10-11: changed banner lower context to muted yellow. Creator question status now continues the banner in evergreen, with ivory question count, sage answer count, a bordered yellow timer and thin sage progress line. Under-two-minute timer retains a high-contrast red warning. Existing timer/progress behavior and other themes preserved. Local only; whitespace check passed, no browser tests per preference.

Completion cohesion — 2026-10-11: joined the banner, evergreen celebration and ivory review footer into one rounded frame. Smoothed the scene into solid green behind copy, reduced gift size, refined submission pill and message divider, aligned footer gutters and cranberry retry action. Removed clipped decorative Thank you lettering while retaining the emerging paper and gift layers. TSX syntax and whitespace checks passed; no browser smoke per prior preference. User requested commit/push.

Browser exam content — 2026-10-11: saved five supplied questions in the existing FY27 draft through JSON pro UI. Knowledge section now has 15 questions, plus two existing ungraded partner-detail fields (17 editor entries). New questions remain ungraded with empty keys pending user confirmation; existing first-ten keys were already marked provisional. Draft status retained.

Preview background extension — 2026-10-11: fixed-height mobile/fullscreen previews now give exam pages a full viewport minimum height, extending the existing pale-yellow background and ornaments below short question content. Auto-height desktop preview retains its content sizing to avoid measurement feedback. Local only; whitespace check passed.

Production recovery and completion wording — 2026-10-11: Vercel builds for 61f844d and ce813c8 failed on redundant Creator comparisons inside the non-Creator branch of PublicExamPage. Removed the narrowed comparisons; full frontend TypeScript check now passes. Completion defaults to END OF EXAM with no eyebrow, and legacy END OF EXAM prefix is stripped from the thank-you message. Editor defaults match. Included mobile preview background extension. Deployment verification follows push.
