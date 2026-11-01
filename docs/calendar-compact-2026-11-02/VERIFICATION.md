# Compact Calendar entries

The user's week/month/day screenshots showed full note cards wrapping into tall blocks. Calendar now uses a single-line title and optional scheduled time, with full context in the title tooltip and the existing note editor. Borders and repeated folder/date lines are removed. Actions remain reachable by hover, keyboard focus, and touch selection; drag/status controls retain their behavior. Month Grid previews three sorted entries per date, with a counted link opening the complete Day view. Agenda remains uncapped.

Changes are confined to frontend Calendar presentation. Source scheduling, Calendar identity, collections, and backend contracts are unchanged. Legacy Book rows and the separate Plan view keep their existing presentation.

Production build, TypeScript, focused ESLint and diff checks passed. The full build retains pre-existing restricted-import warnings elsewhere. No new implementation-mirroring tests were added.

42 measured responsive combinations passed: Cards at320/1024/1912px and Panels at320/1024/1912/3840px, each in Light/Charcoal and Day/Week/Month. All entries remained visible at32px, with no row or document overflow and no repeated metadata line. An additional390px check passed. These are viewport checks, not physical-device/touch certification. Screenshots inspected.

Real local UI checks passed for the month overflow link, Agenda retaining all entries, Projects grouping, Hours retaining09:30, full note editor and preview, keyboard actions, rename/cancel and keyboard drag/cancel. A long-title fixture was created only in the disposable QA database. Both mobile exam questions fit at320px and the first answer saved; date-input automation did not complete the second answer, so this run does not claim full exam submission. No exam code changed.

Zero captured Calendar console errors. Evidence in checks.json and adjacent images. Local build/preview logs: `/tmp/airunote-calendar-compact-{build,preview}.log`; UI4320/API4321. Release SHA/provider result and signed-in production smoke are recorded in the shared handoff after publishing.
