# Shared instructions for coding agents

## Product direction

- Read `prd.md` for the shared product goal before starting product work.
- Treat the current implementation specification and plans in `docs/superpowers/` as the technical decisions for the milestone being implemented.
- If product or technical documents conflict, stop before making a conflicting product decision. Record the conflict in the task and ask the coordinator to resolve it.
- Keep the compliance product auditable: preserve source references, evidence, tenant boundaries, and a review trail when a task touches those areas.

## Worktree and branch isolation

- Work only in the worktree and branch assigned to your session. Check `git status --short --branch` before editing.
- Never edit another session's worktree, switch its branch, or use the same working directory as another active coding session.
- Do not work directly on `main`. Do not reset, clean, force-push, or discard changes you did not create.
- Keep each task's changes limited to its assigned scope. If another file or interface must change, coordinate that before expanding scope.
- Do not commit unrelated or unfinished changes. Commit completed task work on its assigned branch and report the commit and remaining integration needs to the coordinator.

## Task coordination

- The coordinator records assignments in `docs/agent-workplan.md` before parallel implementation begins.
- Each assignment must name one owner, one worktree/branch, a bounded goal, explicit out-of-scope items, expected files or interfaces, dependencies, and acceptance criteria.
- Agents may work in parallel only when their owned files or interfaces do not overlap. Agree on shared interfaces before coding against them.
- Update the task status and summarize changed files, decisions, checks performed, and blockers when the task is complete.
- The coordinator owns integration and resolves conflicts. Do not silently overwrite another agent's work.

## Engineering practices

- Follow existing project patterns and keep changes small and reviewable.
- Never commit credentials, tenant data, customer documents, or local environment files.
- Run only the checks requested for the task or required by repository instructions; report exactly what was and was not run.
- Do not claim a check passed unless it was run successfully in the current task context.
