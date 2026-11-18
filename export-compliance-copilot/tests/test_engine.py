import unittest

from engine import evaluate_case


class EvaluateCaseTests(unittest.TestCase):
    def test_complete_case_is_ready_only_for_human_review(self):
        result = evaluate_case({
            "restricted_party_screening": "clear",
            "destination_risk": "standard",
            "classification": "DEMO-CLASS",
            "end_use": "Industrial maintenance",
            "license_required": False,
        })
        self.assertEqual(result["outcome"], "READY_FOR_HUMAN_REVIEW")
        self.assertTrue(all(item["result"] == "TRUE" for item in result["checks"]))
        self.assertFalse(result["autonomous_legal_decision"])

    def test_missing_information_generates_unknowns_and_questions(self):
        result = evaluate_case({})
        self.assertEqual(result["outcome"], "INFORMATION_REQUIRED")
        self.assertTrue(any(item["result"] == "UNKNOWN" for item in result["checks"]))
        self.assertGreater(len(result["questions"]), 0)

    def test_conflicting_demo_signal_escalates_to_human_review(self):
        result = evaluate_case({
            "restricted_party_screening": "potential_match",
            "destination_risk": "standard",
            "classification": "DEMO-CLASS",
            "end_use": "Industrial maintenance",
            "license_required": False,
        })
        self.assertEqual(result["outcome"], "HUMAN_REVIEW_REQUIRED")
        self.assertTrue(any(item["result"] == "FALSE" for item in result["checks"]))

    def test_required_license_without_status_is_unknown(self):
        result = evaluate_case({"license_required": True})
        license_check = next(item for item in result["checks"] if item["rule_id"] == "POL-005")
        self.assertEqual(license_check["result"], "UNKNOWN")


if __name__ == "__main__":
    unittest.main()
