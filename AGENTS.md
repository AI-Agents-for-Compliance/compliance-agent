# Repository guidance

## Product scope

- The immediate product is a narrow, local Export Compliance Copilot demo for
  gathering case facts and preparing a human compliance review.
- Use synthetic data only. Never add real customer, employee, supplier, or export
  data, credentials, or secrets to the repository.
- Demo policy checks are illustrative. Do not present them as legal advice,
  authoritative export-control rules, clearance, or an autonomous decision.
- Keep a named human responsible for review and decisions. Preserve rule
  references, uncertainty, and audit history in the demo workflow.
- Do not contact customers, publish a deployment, or configure production
  services unless the user specifically asks.

## Working with this repository

- Read the relevant README before changing a component.
- Keep the standalone prototype in `export-compliance-copilot/` runnable without
  third-party dependencies unless the user asks to change that constraint.
- Do not add real secrets. `.env.example` files may contain placeholder values;
  local `.env*` files must remain untracked.
- Use a task branch and keep each change reviewable. Do not edit `main` directly.
- Codex and Claude Code share this file as the common project guidance. For
  simultaneous edits, use separate Git worktrees and branches.
- Before finishing, summarize changed files and any checks performed. Do not
  claim checks passed unless they were run and succeeded.
