# Publication schema for reviewed medicine content

This is the required model before adding a larger medicine dataset or enabling public deployment. The MVP migration now marks its six seed records with `is_demo = true`; the rest of this workflow is pending.

| Field | Purpose |
| --- | --- |
| `status` | `draft`, `in_review`, `published`, or `archived` |
| `reviewed_by` | Reviewer user ID, distinct from editor |
| `reviewed_at` | Timestamp of approval for this revision |
| `last_reviewed_at` | Latest clinical review timestamp |
| `published_at` | First publication timestamp |
| `sources` | Structured citations with title, publisher, URL, access date |
| `version` | Monotonic revision number |
| `is_demo` | Explicit marker for seed content, never considered reviewed |

Publication must require a reviewer, citations and an approved revision. Edits to published content create a draft revision; they must not overwrite the public revision. Archive removes content from public search while preserving history. Demo rows must remain unpublished in production. The current MVP schema does not enforce this workflow yet, so public deployment is blocked.
