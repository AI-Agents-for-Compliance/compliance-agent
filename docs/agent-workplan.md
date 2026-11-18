# Coding agent work plan

This file is the shared handoff board for Codex, Claude Code, and Cursor sessions. The coordinator assigns one owner per task and records the assignment here before parallel implementation starts. Keep tasks narrow enough that owners can work in separate files or against agreed interfaces.

## Current assignments

No implementation tasks are assigned yet. Keep the six sessions aligned to the same product baseline until the coordinator records separate, non-overlapping tasks here.

## Task template

Copy this block for each task:

```markdown
### [TASK-ID] Short task name

- Status: planned | in progress | review | complete | blocked
- Owner/session: Codex Desktop | Codex Terminal | Claude Desktop | Claude Terminal | Cursor Desktop | Cursor Terminal
- Worktree: absolute local path
- Branch: task-specific branch name
- Goal: one concrete outcome
- In scope:
  - ...
- Out of scope:
  - ...
- Files/interfaces owned:
  - ...
- Dependencies / interface agreement:
  - ...
- Acceptance criteria:
  - [ ] ...
- Checks to run:
  - ...
- Completion notes: commit, changed files, checks run, follow-up needs
```

## Assignment rules

1. One task has one owner. Other sessions do not edit its owned files unless the owner and coordinator agree first.
2. Split UI, API, data, and documentation work only when the contracts between them are written down.
3. Prefer independent tasks that do not require editing the same files. If overlap is unavoidable, sequence the work rather than editing concurrently.
4. Mark a task complete only after its acceptance criteria are met and its work is committed. The coordinator reviews and integrates completed work.
5. Refresh this board when priorities or ownership change so every session can see the same current goal.
