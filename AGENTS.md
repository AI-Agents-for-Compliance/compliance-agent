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
- Use one dedicated Git worktree and branch per independently running coding
  session, whether it runs in a desktop app or a terminal. Do not edit in
  another session's worktree or have two sessions write to the same worktree.
- Codex, Claude Code, and Cursor share these repository-level workflow rules;
  Cursor also has a tool-specific rule in `.cursor/rules/`.
- The desktop app and terminal can run independent sessions. Use the distinct
  worktrees listed in the README for each active session; never assume two
  surfaces share context or coordinate file edits.
- When the user-requested task is complete, review the changes and commit and
  push the finished work to its current feature branch without requiring a
  reminder. Leave unrelated or clearly in-progress edits uncommitted and tell
  the user they remain local. Do not merge into `main` or force-push unless the
  user explicitly asks.
- Before finishing, summarize changed files and any checks performed. Do not
  claim checks passed unless they were run and succeeded.
