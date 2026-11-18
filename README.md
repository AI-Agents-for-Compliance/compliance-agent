# Agentic Compliance

Local development repository for the AI Agents for Compliance startup. The current
customer-feedback prototype is the standalone Export Compliance Copilot in
[`export-compliance-copilot/`](export-compliance-copilot/README.md).

## Run the prototype locally

Requirements: Python 3.10 or newer. The prototype uses only the Python standard
library, so no virtual environment or API keys are needed.

```bash
cd export-compliance-copilot
python3 server.py
```

Open <http://127.0.0.1:8010>. Stop the server with `Ctrl+C`. The prototype stores
demo cases locally in `export-compliance-copilot/data/cases.json`; that generated
file is ignored by Git. See the prototype README for its scope, limitations, and
feedback-session guide.

## Save work to GitHub

The local checkout is connected to `AI-Agents-for-Compliance/compliance-agent`
as `origin`. GitHub does not receive local edits automatically. After a task is
finished, review, commit, and push its completed changes to the current feature
branch. Incomplete or unrelated edits should remain uncommitted until ready.

```bash
git switch -c feat/short-task-name
# make and review changes
git status
git add -A
git commit -m "Describe the change"
git push -u origin HEAD
```

Use a separate branch for each task and open a pull request to `main` when it is
ready for review. Do not put credentials, `.env` files, or real customer,
employee, supplier, or export data in Git. The checked-in `.env.example` files
contain placeholders only.

## Using Codex and Claude Code

Each independently running coding session gets its own worktree and branch.
The desktop-app sessions use these worktrees:

| Session | Folder | Branch |
| --- | --- | --- |
| Codex desktop app | `/Users/Alex/compliance-agent` | `codex/startup-local-workflow` |
| Codex terminal | `/Users/Alex/compliance-agent-codex-cli` | `codex/terminal-agent` |
| Claude desktop app | `/Users/Alex/compliance-agent-claude` | `claude/agentic-compliance` |
| Claude terminal | `/Users/Alex/compliance-agent-claude-cli` | `claude/terminal-agent` |
| Cursor desktop app | `/Users/Alex/compliance-agent-cursor` | `cursor/agentic-compliance` |
| Cursor terminal | `/Users/Alex/compliance-agent-cursor-cli` | `cursor/terminal-agent` |

Open each app on its assigned folder. Start terminal agents in the matching
folder, for example:

```bash
cd /Users/Alex/compliance-agent-codex-cli && codex --model gpt-5.6-terra
cd /Users/Alex/compliance-agent-claude-cli && claude
cd /Users/Alex/compliance-agent-cursor-cli && agent
```

App and terminal sessions are independent and do not share conversation context.
Never point two active writing sessions at the same worktree. Shared rules are
in [`AGENTS.md`](AGENTS.md), [`CLAUDE.md`](CLAUDE.md), and
`.cursor/rules/worktree-isolation.mdc`.

## Other application scaffolds

`backend/` and `frontend/` contain the broader application scaffold. The
standalone feedback prototype can be run independently using the instructions
above.
