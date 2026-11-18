# Export Compliance Copilot — Demo

A small local prototype of an internal export-compliance workflow. It turns case facts into deterministic, traceable policy checks, highlights missing information, and records a human review in an audit log.

## Run locally

Requirements: Python 3.10 or newer. No third-party packages are required.

```bash
cd export-compliance-copilot
python3 server.py
```

Open <http://127.0.0.1:8010>. Stop the server with `Ctrl+C`. Demo cases and review records are stored in `data/cases.json` on this machine. Delete that file to reset the sample data.

## What the prototype demonstrates

- Three synthetic export cases with different outcomes.
- A guided intake agent that collects one fact at a time, proposes explicit
  values from labelled input, and requires the participant to confirm every
  proposal before it becomes part of the case.
- A versioned deterministic policy evaluator. Each check returns `TRUE`, `FALSE`, or `UNKNOWN` with an explanation and a rule reference.
- Missing information becomes a follow-up question.
- Conflicts and complete cases both remain subject to human review.
- Reviewer, decision, note, timestamp, and rule evaluation are recorded in an audit log.
- New synthetic cases can be created through the UI.

The demo uses made-up internal-policy examples. It does not implement export-control law, validate real sanctions data, classify goods, recommend a license, or make a legal or business decision. Do not enter real customer, employee, supplier, or export data. All names and values are synthetic.

## Architecture

```text
web/ (plain HTML/CSS/JS)
        │ same-origin JSON API
server.py (Python standard library HTTP server)
        ├── engine.py (versioned deterministic checks)
        └── data/cases.json (local demo persistence)
```

There is no LLM in the critical decision path. The model's future role should be limited to extracting candidate facts from documents and proposing questions; the deterministic rules and an authorized human reviewer remain in control.

## Guided intake agent

Use **+ Geführte Eingabe** to create an empty synthetic case. The agent asks
for the next missing fact, or can read explicitly labelled input such as
`Unternehmen: Demo GmbH; Produkt: Sensormodul`. It displays suggestions before
they are stored. Only **Angaben bestätigen & prüfen** writes those values to the
case and re-runs the deterministic rules.

The current agent is a conservative, dependency-free parser rather than an LLM.
It intentionally declines ambiguous statements and asks a follow-up question.
This gives a future LLM adapter one narrow role: return the same unconfirmed
fact-proposal shape. It must not set rule outcomes, make legal assertions, or
record a human decision.

## Rule outcomes

- `INFORMATION_REQUIRED`: at least one rule is `UNKNOWN` and none is `FALSE`.
- `HUMAN_REVIEW_REQUIRED`: at least one rule is `FALSE`.
- `READY_FOR_HUMAN_REVIEW`: all demo checks are `TRUE`; this does not mean the export is legally cleared.

Human review records use three labels: `approved_by_reviewer`, `rejected_by_reviewer`, and `more_information_requested`. They represent an explicitly entered demo action, not an automated recommendation.

## Tests

```bash
python3 -m unittest discover -s tests -v
```

## Customer feedback guide

Run the demo with a compliance professional using synthetic facts only. Ask them to narrate their normal workflow and compare the prototype with that workflow.

1. Which export review step currently causes the most delay or rework?
2. What evidence do you need before you can even start reviewing a case?
3. Which facts can be checked mechanically, and which require expert judgment?
4. What should happen when information is missing, conflicting, or uncertain?
5. Which rule source, version, and evidence must appear in an audit record?
6. Where must a named human approve, reject, or request more information?
7. What would make this workflow unsafe or unusable in your organization?
8. Would this save time in one specific process? What measurable result would prove it?

Record observations, not confidential examples. Do not collect live customer documents, names, or transaction details in this demo.
