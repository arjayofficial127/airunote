MODE: CODE
MODE: ARCHITECTURAL

PROJECT: Airunote
PHASE: 5 — Permission Resolver

OBJECTIVE:
Extract access logic into single permission resolver service.

Rules:
- owner always allowed
- explicit share allowed
- no admin override
- org boundary enforced first

Create:
airunote.permissionResolver.ts

All repository reads must pass through resolver.