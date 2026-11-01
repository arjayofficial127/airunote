# Notes Archive and Trash

Verified locally on 1 November 2026 (Asia/Singapore).

## Behavior

- Folder and note rows expose a quiet actions button on hover or keyboard focus, with touch availability. The shared Note reader also has actions.
- Archive retains a folder and its branch together. Archived branches disappear from the active Folders, List, Calendar, Board, Canvas and Study browsing surfaces.
- Delete moves a note to recoverable Trash. Deleting a folder moves its direct notes and subfolders to its parent, then moves the empty folder to Trash. Nested branches remain intact.
- Promotion, lifecycle metadata and inherited sprint definitions commit in one transaction. A name collision, conflicting sprint or invalid configuration rolls back the whole operation.
- Folder-owned saved lenses remain attached to the recoverable folder. Restoring the folder does not pull promoted contents back.
- Archive / Trash in the Folders header provides recovery. Ancestors must be restored before a child can be restored.
- Owned UUIDs, organization membership, root protection and stale-version checks guard the backend. Unsaved editor, rename, folder and capture drafts block lifecycle changes.
- Existing document state and folder metadata are used. No schema migration, seed or production data operation is required for deployment.

## Verification

- Frontend production build passed, including the final Inbox control adjustment. Existing repository lint warnings remain.
- Focused frontend and backend lint passed. Backend build and strict type check passed.
- Standalone frontend type check still reports the pre-existing missing `closed` field in `frontend/scripts/notes-agenda.test.ts:6`. No new type errors were reported.
- Eight lifecycle PostgreSQL integration tests passed in the explicitly named disposable `lifecycle_test` database: archive/restore, direct-child promotion, content/sprint/lens preservation, note and folder collision rollback, root and ownership boundaries, stale operations, note recovery and inactive ancestors.
- Eighteen Book integration/contract regressions and five exam access/entry/attempt regressions passed.
- Local backend database health connected. An unauthenticated lifecycle PATCH returned UNAUTHORIZED without mutating data.
- Browser verified folder archive/restore, nonempty-folder deletion with notes promoted to Lessons, folder recovery, note archive/Trash/restore, persistence after refresh and unsaved capture protection.
- Archived Lessons disappeared from the focused tree, frozen Board and frozen Study; the invalid folder pane safely returned to Workspace. Restoring Lessons returned its branch.
- Charcoal dialog verified at 390 x 844 with 390px document width and dialog within the viewport. Four-pane views exercised at 3840 x 2160. Temporary viewport overrides reset.
- Final browser console recorded no errors. Disposable note and folder restored to their original location; production records were not changed.

## Review artifacts

- `folder-actions.png`: Archive and Delete choices in the existing Folders workspace.
- `folder-delete.png`: Exact preservation and recovery explanation before deletion.

## Release dependency

Both frontend and backend must deploy this commit. The lifecycle routes are new backend endpoints. At verification time Render was signed out and a sign-in request was pending; local success does not establish production deployment.
