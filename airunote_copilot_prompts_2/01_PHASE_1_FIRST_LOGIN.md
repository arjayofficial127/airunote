You are a Principal Engineer.

Fix first login flow:
- If orgs.length === 0 → redirect to /orgs
- After org creation → redirect to /orgs/{orgId}/airunote
- Use existing OrgSessionProvider
- Minimal diff only