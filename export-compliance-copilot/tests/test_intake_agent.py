import unittest

from intake_agent import assistant_reply, extract_proposals, next_question, pending_fields


class IntakeAgentTests(unittest.TestCase):
    def test_new_case_starts_with_company_question(self):
        question = next_question({})
        self.assertEqual(question["field"], "company")
        self.assertIn("Unternehmen", question["question"])

    def test_labelled_answer_proposes_multiple_facts(self):
        proposals = extract_proposals(
            {},
            "Unternehmen: Nordstern Systems; Produkt: Industrial sensor module; Zielregion: Deutschland",
        )
        self.assertEqual([item["field"] for item in proposals], ["company", "product", "destination"])
        self.assertEqual(proposals[0]["value"], "Nordstern Systems")

    def test_choice_answer_is_normalised_only_when_unambiguous(self):
        case = {"company": "Demo", "product": "Sensor", "destination": "Deutschland", "end_user": "Werkstatt"}
        proposals = extract_proposals(case, "unauffällig")
        self.assertEqual(proposals[0]["field"], "restricted_party_screening")
        self.assertEqual(proposals[0]["value"], "clear")
        self.assertEqual(extract_proposals(case, "wahrscheinlich okay"), [])

    def test_agent_marks_proposals_as_unconfirmed(self):
        reply = assistant_reply({}, [{"field": "company", "label": "Unternehmen", "value": "Demo GmbH"}])
        self.assertEqual(reply["proposals"][0]["value"], "Demo GmbH")
        self.assertIn("bestätige", reply["message"].lower())
        self.assertIn("keine Compliance", reply["disclaimer"])

    def test_license_status_is_only_requested_after_required_license_is_confirmed(self):
        case = {
            "company": "Demo", "product": "Sensor", "destination": "Deutschland", "end_user": "Werkstatt",
            "restricted_party_screening": "clear", "destination_risk": "standard",
            "classification": "DEMO", "end_use": "Wartung", "license_required": True,
        }
        self.assertEqual(pending_fields(case), ["license_status"])


if __name__ == "__main__":
    unittest.main()
