# Exam responsive layout — MultiPoint UI

## Changes

The appearance preview fills its container; mobile preview is capped at 390px and shrinks on smaller screens. The preview fieldset explicitly permits shrinking. There is no outer horizontal preview scroll container.

Exam editor columns respond to the available container width rather than the window width. Tabs and action controls wrap. Inputs, option rows, and selects can shrink. Brand names, badges, question prompts, answers, and review content wrap long unbroken text. The question toolbar stacks on phones, preserves the timer, and shows branding only when sufficient width is available. The question hero's text column is explicitly bounded.

## Local validation (2026-10-10)

Completed two implementation/build/smoke cycles, within the requested maximum of three.

- Production Next.js build passed (existing repository lint warnings remain).
- Checked entry, questions, completion, upcoming, ended, terminated, and timed-out previews for Autumn, Plain, and Wrapped in Joy in container and mobile modes.
- Checked narrow preview content bounds, not only document scroll width. Cycle one exposed a stretched question hero at 320px; cycle two fixed it and the 21 narrow theme/state cases passed.
- Checked all four exam editor tabs at 320, 390, 768, 1024, and 1280px, without horizontal main-content overflow.
- Checked template editor at phone width and desktop width.
- Actual local holiday question form measured without horizontal overflow or out-of-bounds headings/controls at 320, 390, 768, 1024, and 1440px.
- Completed disposable local attempts for all three themes, exercising single choice, multiple choice, true/false, short text, confirmation, and answer review. Long unbroken prompts and option labels were included.
- No production attempts, exam definitions, schedules, or template data were modified by these tests. No backend or database changes are required.

Browser smoke testing used Chrome. Other browser engines were not directly tested.
