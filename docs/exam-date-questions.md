# Date questions

The question editor and JSON import support `type: "date"`. Respondents use the browser's native calendar, whose display follows their locale; answer values and reporting remain `YYYY-MM-DD`, without timezone conversion. Impossible dates and non-ISO date strings are rejected by the backend. Date answers follow the same autosave, question timing, submission, and grading paths as short text.

Before deploying the backend, run `scripts/migrate-exam-date-questions.ts` with an explicit `DATABASE_URL` to extend the question-type constraint. Existing questions are not automatically converted. Exams with attempts retain their structure lock.

The local appearance workspace includes a Date preview state.
