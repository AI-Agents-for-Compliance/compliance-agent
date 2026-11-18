"""Local demo server for the Export Compliance Copilot."""

from __future__ import annotations

import json
import os
import threading
import uuid
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from engine import evaluate_case

ROOT = Path(__file__).parent
WEB_ROOT = ROOT / "web"
DATA_FILE = ROOT / "data" / "cases.json"
LOCK = threading.Lock()


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def seed_cases() -> list[dict[str, Any]]:
    samples = [
        {
            "id": "demo-ready",
            "reference": "EXP-2026-001",
            "company": "Nordstern Systems (Demo)",
            "product": "Industrial sensor module",
            "destination": "Germany",
            "end_user": "Werkstatt AG (Demo)",
            "end_use": "Industrial equipment maintenance",
            "classification": "EAR99 (demo value)",
            "restricted_party_screening": "clear",
            "destination_risk": "standard",
            "license_required": False,
            "license_status": None,
            "status": "open",
            "created_at": now(),
        },
        {
            "id": "demo-questions",
            "reference": "EXP-2026-002",
            "company": "Hanseatic Robotics (Demo)",
            "product": "Control unit X4",
            "destination": "Exampleland",
            "end_user": "Example Research Institute",
            "end_use": "Not yet provided",
            "classification": "",
            "restricted_party_screening": "",
            "destination_risk": "",
            "license_required": None,
            "license_status": None,
            "status": "open",
            "created_at": now(),
        },
        {
            "id": "demo-escalation",
            "reference": "EXP-2026-003",
            "company": "Alpine Components (Demo)",
            "product": "Precision actuator",
            "destination": "Exampleland",
            "end_user": "Example Trading Ltd.",
            "end_use": "Industrial automation",
            "classification": "ECCN 2B999 (demo value)",
            "restricted_party_screening": "potential_match",
            "destination_risk": "heightened",
            "license_required": True,
            "license_status": "not_provided",
            "status": "open",
            "created_at": now(),
        },
    ]
    for case in samples:
        case["evaluation"] = evaluate_case(case)
        case["audit_log"] = [
            {"at": case["created_at"], "actor": "Demo-System", "action": "CASE_CREATED", "detail": "Synthetischer Demo-Fall angelegt."},
            {"at": case["created_at"], "actor": "Demo-System", "action": "RULES_EVALUATED", "detail": f"Regelwerk {case['evaluation']['ruleset_version']} ausgeführt."},
        ]
    return samples


def ensure_data() -> None:
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not DATA_FILE.exists():
        save_cases(seed_cases())


def load_cases() -> list[dict[str, Any]]:
    ensure_data()
    with LOCK:
        return json.loads(DATA_FILE.read_text(encoding="utf-8"))


def save_cases(cases: list[dict[str, Any]]) -> None:
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with LOCK:
        DATA_FILE.write_text(json.dumps(cases, ensure_ascii=False, indent=2), encoding="utf-8")


class Handler(BaseHTTPRequestHandler):
    server_version = "ComplianceCopilotDemo/0.1"

    def log_message(self, fmt: str, *args: Any) -> None:
        if os.environ.get("QUIET") != "1":
            super().log_message(fmt, *args)

    def send_json(self, payload: Any, status: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        if length > 1_000_000:
            raise ValueError("Request body is too large")
        return json.loads(self.rfile.read(length) or b"{}")

    def do_GET(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        if path == "/api/cases":
            self.send_json(sorted(load_cases(), key=lambda c: c["created_at"], reverse=True))
            return
        if path.startswith("/api/cases/"):
            case_id = path.rsplit("/", 1)[-1]
            case = next((c for c in load_cases() if c["id"] == case_id), None)
            self.send_json(case if case else {"error": "Fall nicht gefunden"}, 200 if case else 404)
            return
        relative = "index.html" if path == "/" else path.lstrip("/")
        target = (WEB_ROOT / relative).resolve()
        if WEB_ROOT.resolve() not in target.parents and target != WEB_ROOT.resolve():
            self.send_error(404)
            return
        if not target.is_file():
            self.send_error(404)
            return
        content_type = "text/html; charset=utf-8" if target.suffix == ".html" else "text/css; charset=utf-8" if target.suffix == ".css" else "text/javascript; charset=utf-8"
        body = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        try:
            payload = self.read_json()
        except (ValueError, json.JSONDecodeError) as exc:
            self.send_json({"error": str(exc)}, 400)
            return
        cases = load_cases()
        if path == "/api/cases":
            required = ["company", "product", "destination", "end_user"]
            missing = [field for field in required if not str(payload.get(field, "")).strip()]
            if missing:
                self.send_json({"error": "Bitte Pflichtfelder ausfüllen.", "fields": missing}, 400)
                return
            case: dict[str, Any] = {
                "id": str(uuid.uuid4()),
                "reference": f"EXP-{datetime.now().year}-{uuid.uuid4().hex[:4].upper()}",
                "status": "open",
                "created_at": now(),
                "audit_log": [],
                **{key: payload.get(key) for key in (
                    "company", "product", "destination", "end_user", "end_use",
                    "classification", "restricted_party_screening", "destination_risk",
                    "license_required", "license_status",
                )},
            }
            case["evaluation"] = evaluate_case(case)
            case["audit_log"] = [
                {"at": case["created_at"], "actor": "Demo-System", "action": "CASE_CREATED", "detail": "Neuer Demo-Fall angelegt."},
                {"at": case["created_at"], "actor": "Demo-System", "action": "RULES_EVALUATED", "detail": f"Regelwerk {case['evaluation']['ruleset_version']} ausgeführt."},
            ]
            cases.append(case)
            save_cases(cases)
            self.send_json(case, 201)
            return
        parts = path.strip("/").split("/")
        if len(parts) == 4 and parts[:2] == ["api", "cases"] and parts[3] == "review":
            case = next((c for c in cases if c["id"] == parts[2]), None)
            decision = payload.get("decision")
            if not case:
                self.send_json({"error": "Fall nicht gefunden"}, 404)
                return
            if decision not in {"approved_by_reviewer", "rejected_by_reviewer", "more_information_requested"}:
                self.send_json({"error": "Ungültige menschliche Prüfentscheidung."}, 400)
                return
            reviewer = str(payload.get("reviewer", "Reviewer")).strip()[:100] or "Reviewer"
            note = str(payload.get("note", "")).strip()[:1000]
            case["status"] = decision
            case["review"] = {"decision": decision, "reviewer": reviewer, "note": note, "at": now()}
            case["audit_log"].append({"at": case["review"]["at"], "actor": reviewer, "action": "HUMAN_REVIEW_RECORDED", "detail": f"{decision}: {note}".rstrip()})
            save_cases(cases)
            self.send_json(case)
            return
        self.send_json({"error": "Endpunkt nicht gefunden"}, 404)


def main() -> None:
    ensure_data()
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8010"))
    server = ThreadingHTTPServer((host, port), Handler)
    print(f"Export Compliance Copilot läuft auf http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer wird beendet.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
