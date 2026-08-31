# Resident Exams Implementation Plan

## Product goal

Make Exams the highlighted, primary workspace journey for exam-focused users while keeping the rest of airunote available as secondary navigation. Exams are a resident airunote capability with dedicated database tables, not an installable app and not a website-builder feature.

## Defaults and adjustable controls

- 20-minute duration.
- One question at a time.
- Prevent tab switching/window focus loss. A detected violation logs an event and ends the attempt with a contact-your-admin message.
- Maximum three attempts per respondent identity. Device, network, and browser request signals are hashed for audit support without exposing raw IP addresses or preventing another respondent from using the same browser.
- Autosave every answer and keep incomplete attempts visible to administrators.
- After submission, show the respondent's questions and answers without revealing correct answers. Administrators can switch to showing correct answers or showing no review.
- Shuffle questions and/or choices, with individually pinned sections/questions excluded from random movement.

## Authoring

- Exam dashboard with draft, published, and closed states.
- Visual question editor for single choice, multiple choice, true/false, and short text.
- JSON editor/import for quickly pushing a complete exam representation.
- Correct answer(s), graded/ungraded state, points, required state, section, and pinned state per question.
- Structural edits remain available before attempts begin. After responses exist, grading, points, explanations, and correct answers remain editable without deleting historical answers.

## Answering and identity

- Public exam link; respondents do not need an airunote account.
- Capture name plus optional email/student ID, a local device identifier, and hashed request signals.
- Persist a deterministic shuffled order per attempt.
- Autosave each answer, update last-active time, and retain incomplete work.
- Timer is server-authoritative and automatically completes expired attempts.
- Continue links are admin-issued, rotate the private attempt token, and can include additional time.

## Reports

- Live active-attempt list with elapsed/remaining time.
- Respondent-by-question answer matrix.
- Completion status, current score, and percentage per respondent.
- Per-question correct count/percentage and the respondents who answered correctly.
- Reports calculate against current grading rules so marking a previously ungraded question or adding a correct answer immediately updates all historical scores.

## Workspace journey settings

- Organization setting for `Exam-first` or `Standard` journey.
- Toggle top-level visibility for Exams and Notes.
- Exam-first places Exams first and sends the Exams route the strongest visual emphasis; secondary airunote features remain available.

## Delivery and verification

- Add only new exam tables and indexes in Neon/PostgreSQL.
- Add authenticated organization-member management APIs plus isolated public answering APIs.
- Run migration against the configured Neon database, backend tests/build, frontend typecheck/build, and local browser verification before handoff.

## Browser anti-cheat boundary

Focus/visibility changes can be detected and enforced while the page is open. Browser software cannot prove that a second device, virtual machine, screen capture, or OS-level tool was not used. The report therefore records violations as evidence rather than presenting the feature as a secure kiosk replacement.
