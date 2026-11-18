"""Conservative, explainable intake helper for synthetic export demo cases.

This module deliberately does not make legal conclusions. It only turns a
participant's answer into *proposed* case facts and asks for confirmation.
An LLM adapter may later populate the same proposal shape, but confirmed facts
are always evaluated by the deterministic rules in ``engine.py``.
"""

from __future__ import annotations

import re
from typing import Any


FIELD_LABELS = {
    "company": "Unternehmen",
    "product": "Produkt",
    "destination": "Zielregion",
    "end_user": "Endnutzer",
    "restricted_party_screening": "Screening",
    "destination_risk": "Zielrisiko",
    "classification": "Produktklassifizierung",
    "end_use": "Verwendungszweck",
    "license_required": "Genehmigung erforderlich",
    "license_status": "Genehmigungsstatus",
}

QUESTION_TEXT = {
    "company": "Für welches Unternehmen wird der Exportfall angelegt?",
    "product": "Welches Produkt oder welcher Artikel soll exportiert werden?",
    "destination": "In welches Zielland oder welche Zielregion geht die Lieferung?",
    "end_user": "Wer ist der Endnutzer oder die empfangende Organisation?",
    "restricted_party_screening": "Wie lautet das dokumentierte Screening-Ergebnis? (unauffällig, möglicher Treffer oder bestätigter Treffer)",
    "destination_risk": "Wie ist das Zielrisiko im internen Prozess eingestuft? (Standard, erhöht oder gesperrt)",
    "classification": "Welche Produktklassifizierung ist dokumentiert?",
    "end_use": "Welcher konkrete Verwendungszweck ist dokumentiert?",
    "license_required": "Ist laut interner Prüfung eine Genehmigung erforderlich? (ja, nein oder noch offen)",
    "license_status": "Welchen dokumentierten Genehmigungsstatus gibt es? (erteilt, ausstehend oder abgelehnt)",
}


def _text(value: Any) -> str:
    return str(value or "").strip()


def pending_fields(case: dict[str, Any]) -> list[str]:
    """Return the next facts needed for a complete demo intake."""
    ordered = [
        "company", "product", "destination", "end_user",
        "restricted_party_screening", "destination_risk", "classification", "end_use",
        "license_required",
    ]
    missing = []
    for field in ordered:
        value = case.get(field)
        if field == "license_required":
            if value is None:
                missing.append(field)
        elif not _text(value) or _text(value).lower() == "not yet provided":
            missing.append(field)
    if case.get("license_required") is True and not _text(case.get("license_status")):
        missing.append("license_status")
    return missing


def next_question(case: dict[str, Any]) -> dict[str, str] | None:
    fields = pending_fields(case)
    if not fields:
        return None
    field = fields[0]
    return {"field": field, "question": QUESTION_TEXT[field]}


def _normalise_choice(field: str, value: str) -> Any | None:
    text = value.lower().strip()
    if field == "restricted_party_screening":
        if any(word in text for word in ("unauffällig", "clear", "kein treffer")):
            return "clear"
        if "möglich" in text or "potential" in text:
            return "potential_match"
        if "bestätigt" in text or "confirmed" in text:
            return "confirmed_match"
    if field == "destination_risk":
        if "gesperrt" in text or "prohibited" in text:
            return "prohibited"
        if "erhöht" in text or "heightened" in text:
            return "heightened"
        if "standard" in text:
            return "standard"
    if field == "license_required":
        if text in {"ja", "yes", "true"} or text.startswith("ja "):
            return True
        if text in {"nein", "no", "false"} or text.startswith("nein "):
            return False
    if field == "license_status":
        if "erteilt" in text or "granted" in text:
            return "granted"
        if "ausstehend" in text or "pending" in text:
            return "pending"
        if "abgelehnt" in text or "denied" in text:
            return "denied"
    return None


def _labelled_value(message: str, aliases: tuple[str, ...]) -> str | None:
    alias = "|".join(re.escape(item) for item in aliases)
    match = re.search(rf"(?:^|[\n;,])\s*(?:{alias})\s*[:=]\s*([^\n;,]+)", message, re.I)
    return match.group(1).strip() if match else None


def extract_proposals(case: dict[str, Any], message: str) -> list[dict[str, Any]]:
    """Extract only explicit labels, or one answer to the current question.

    We avoid broad natural-language inference on purpose: ambiguity results in a
    follow-up question rather than a potentially misleading fact.
    """
    message = _text(message)[:2000]
    if not message:
        return []
    aliases = {
        "company": ("unternehmen", "firma", "company"),
        "product": ("produkt", "artikel", "product"),
        "destination": ("zielregion", "zielland", "ziel", "destination"),
        "end_user": ("endnutzer", "empfänger", "end user"),
        "classification": ("klassifizierung", "classification", "eccn"),
        "end_use": ("verwendungszweck", "end use"),
        "restricted_party_screening": ("screening",),
        "destination_risk": ("zielrisiko", "risiko", "destination risk"),
        "license_required": ("genehmigung nötig", "genehmigung erforderlich", "license required"),
        "license_status": ("genehmigungsstatus", "license status"),
    }
    proposals: list[dict[str, Any]] = []
    for field, names in aliases.items():
        value = _labelled_value(message, names)
        if value is None:
            continue
        normalised = _normalise_choice(field, value)
        if field in {"restricted_party_screening", "destination_risk", "license_required", "license_status"} and normalised is None:
            continue
        proposals.append({"field": field, "label": FIELD_LABELS[field], "value": normalised if normalised is not None else value})

    if proposals:
        return proposals

    question = next_question(case)
    if not question:
        return []
    field = question["field"]
    normalised = _normalise_choice(field, message)
    if field in {"restricted_party_screening", "destination_risk", "license_required", "license_status"}:
        if normalised is None:
            return []
        value: Any = normalised
    else:
        value = message
    return [{"field": field, "label": FIELD_LABELS[field], "value": value}]


def assistant_reply(case: dict[str, Any], proposals: list[dict[str, Any]]) -> dict[str, Any]:
    """Build the UI-safe response shape for an intake turn."""
    if proposals:
        return {
            "message": "Ich habe diese Angaben als Vorschlag erfasst. Bitte bestätige sie; erst dann werden sie im Fall gespeichert und geprüft.",
            "proposals": proposals,
            "question": None,
            "disclaimer": "Der Assistent bereitet eine interne Prüfung vor und trifft keine Compliance- oder Rechtsentscheidung.",
        }
    question = next_question(case)
    if question:
        message = "Ich konnte daraus noch keinen eindeutigen Wert übernehmen. " + question["question"]
    else:
        message = "Alle Demo-Angaben sind erfasst. Bitte prüfe die Regelbewertung mit einer zuständigen Person."
    return {
        "message": message,
        "proposals": [],
        "question": question,
        "disclaimer": "Der Assistent bereitet eine interne Prüfung vor und trifft keine Compliance- oder Rechtsentscheidung.",
    }
