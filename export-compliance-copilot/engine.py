"""Deterministic, illustrative policy checks for demo export cases."""

from __future__ import annotations

from typing import Any

RULESET_VERSION = "DEMO-EXPORT-POLICY-1.0"


def check(rule_id: str, title: str, value: bool | None, basis: str, explanation: str) -> dict[str, Any]:
    result = "TRUE" if value is True else "FALSE" if value is False else "UNKNOWN"
    return {
        "rule_id": rule_id,
        "title": title,
        "result": result,
        "basis": basis,
        "explanation": explanation,
    }


def evaluate_case(case: dict[str, Any]) -> dict[str, Any]:
    """Run a small ruleset that models an internal demo policy, not law."""
    screening = str(case.get("restricted_party_screening") or "").lower()
    if screening == "clear":
        screening_result = True
        screening_text = "Demo-Datensatz meldet keine Auffälligkeit."
    elif screening in {"potential_match", "confirmed_match"}:
        screening_result = False
        screening_text = "Demo-Datensatz enthält eine Auffälligkeit; menschliche Klärung ist erforderlich."
    else:
        screening_result = None
        screening_text = "Screening-Ergebnis fehlt oder ist nicht auswertbar."

    risk = str(case.get("destination_risk") or "").lower()
    if risk in {"standard", "heightened"}:
        risk_result = True
        risk_text = f"Risikostufe '{risk}' erfordert laut Demo-Richtlinie zusätzliche menschliche Prüfung."
    elif risk == "prohibited":
        risk_result = False
        risk_text = "Demo-Richtlinie markiert die Zielregion als gesperrt."
    else:
        risk_result = None
        risk_text = "Risikoeinstufung des Ziels fehlt."

    classification_result = True if str(case.get("classification") or "").strip() else None
    classification_text = "Klassifizierung ist dokumentiert; die inhaltliche Richtigkeit wird nicht geprüft." if classification_result else "Produktklassifizierung fehlt."

    end_use_result = True if str(case.get("end_use") or "").strip() and str(case.get("end_use")).lower() != "not yet provided" else None
    end_use_text = "Verwendungszweck ist erfasst; eine fachliche Validierung bleibt erforderlich." if end_use_result else "Konkreter Verwendungszweck fehlt."

    license_required = case.get("license_required")
    license_status = str(case.get("license_status") or "").lower()
    if license_required is None:
        license_result = None
        license_text = "Es ist noch nicht dokumentiert, ob laut interner Prüfung eine Genehmigung benötigt wird."
    elif license_required is False:
        license_result = True
        license_text = "Fallverantwortliche haben im Demo-Formular 'nicht erforderlich' angegeben."
    elif license_status == "granted":
        license_result = True
        license_text = "Genehmigungsnachweis ist im Demo-Fall als erteilt markiert."
    elif license_status in {"denied", "not_required"}:
        license_result = False
        license_text = "Der dokumentierte Genehmigungsstatus erfüllt die Demo-Richtlinie nicht."
    else:
        license_result = None
        license_text = "Genehmigung ist laut Fallangabe erforderlich, Status oder Nachweis fehlt."

    checks = [
        check("POL-001", "Screening dokumentiert und unauffällig", screening_result, "Demo-Richtlinie § 1.1", screening_text),
        check("POL-002", "Zielrisiko erfasst", risk_result, "Demo-Richtlinie § 1.2", risk_text),
        check("POL-003", "Produktklassifizierung dokumentiert", classification_result, "Demo-Richtlinie § 2.1", classification_text),
        check("POL-004", "Verwendungszweck dokumentiert", end_use_result, "Demo-Richtlinie § 2.2", end_use_text),
        check("POL-005", "Genehmigungsstatus geklärt", license_result, "Demo-Richtlinie § 3.1", license_text),
    ]
    failures = [item for item in checks if item["result"] == "FALSE"]
    unknowns = [item for item in checks if item["result"] == "UNKNOWN"]
    if failures:
        outcome = "HUMAN_REVIEW_REQUIRED"
        summary = "Mindestens eine Demo-Regel meldet einen Konflikt. Der Fall muss durch eine zuständige Person geprüft werden."
    elif unknowns:
        outcome = "INFORMATION_REQUIRED"
        summary = "Für eine belastbare interne Prüfung fehlen Angaben. Bitte die offenen Punkte klären."
    else:
        outcome = "READY_FOR_HUMAN_REVIEW"
        summary = "Alle Demo-Prüfpunkte sind dokumentiert. Eine menschliche Freigabe ist weiterhin erforderlich."
    return {
        "ruleset_version": RULESET_VERSION,
        "outcome": outcome,
        "summary": summary,
        "checks": checks,
        "questions": [f"Bitte klären: {item['title']}." for item in unknowns],
        "evaluated_by": "Deterministische Demo-Regeln",
        "autonomous_legal_decision": False,
    }
