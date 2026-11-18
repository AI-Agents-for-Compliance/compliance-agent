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

Open this repository folder as the local Codex project. Start Claude Code from
this same folder when working sequentially. For simultaneous code changes, give
each tool its own Git worktree and branch; do not have both edit the same
checkout at once. Shared repository instructions are in [`AGENTS.md`](AGENTS.md)
and [`CLAUDE.md`](CLAUDE.md).

## Other application scaffolds

`backend/` and `frontend/` contain the broader application scaffold. The
standalone feedback prototype can be run independently using the instructions
above.
