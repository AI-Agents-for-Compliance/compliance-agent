import http.client
import json
import tempfile
import threading
import unittest
from pathlib import Path

import server as server_module


class GuidedIntakeApiTests(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.original_data_file = server_module.DATA_FILE
        server_module.DATA_FILE = Path(self.tempdir.name) / "cases.json"
        self.server = server_module.ThreadingHTTPServer(("127.0.0.1", 0), server_module.Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        server_module.DATA_FILE = self.original_data_file
        self.tempdir.cleanup()

    def post(self, path, payload):
        connection = http.client.HTTPConnection("127.0.0.1", self.server.server_port)
        body = json.dumps(payload)
        connection.request("POST", path, body=body, headers={"Content-Type": "application/json"})
        response = connection.getresponse()
        result = json.loads(response.read())
        connection.close()
        return response.status, result

    def test_proposed_fact_is_not_stored_until_confirmed_and_is_audited(self):
        status, started = self.post("/api/cases/intake", {})
        self.assertEqual(status, 201)
        case_id = started["case"]["id"]

        status, proposed = self.post(f"/api/cases/{case_id}/intake", {"message": "Unternehmen: Demo GmbH"})
        self.assertEqual(status, 200)
        self.assertEqual(proposed["case"]["company"], "")
        self.assertEqual(proposed["case"]["pending_facts"][0]["value"], "Demo GmbH")

        status, confirmed = self.post(f"/api/cases/{case_id}/intake", {"confirm": True})
        self.assertEqual(status, 200)
        self.assertEqual(confirmed["case"]["company"], "Demo GmbH")
        actions = [entry["action"] for entry in confirmed["case"]["audit_log"]]
        self.assertIn("INTAKE_FACTS_CONFIRMED", actions)
        self.assertEqual(confirmed["case"]["evaluation"]["outcome"], "INFORMATION_REQUIRED")


if __name__ == "__main__":
    unittest.main()
