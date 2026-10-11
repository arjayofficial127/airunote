# On-site examiner code

Admins can generate or disable an eight-digit code using **Examiner code** in the exam editor. Only the hash is stored; copy the generated code before closing the dialog. Rotating the code invalidates unused entry grants. Existing attempts keep their normal attempt tokens.

The public gift opens into a masked code form. A correct code grants access to the details form for two hours; the timer starts only when the respondent selects Start exam. The start API independently validates the grant, exam ID, expiry and current code hash. It enforces the published status, schedule and normal attempt limits. Preview access remains separate.

Apply `0034_exam_access_codes.sql` before deploying the backend. The dedicated unlock endpoint limits failed guesses; successful on-site participants sharing an IP do not consume that limit.
