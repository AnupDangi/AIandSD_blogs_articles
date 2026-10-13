import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

from document_intelligence.jobs import JobStore
from document_intelligence.workflow import CheckpointStore


class JobRevisionTests(unittest.TestCase):
    def test_stale_writer_cannot_replace_revision_five_after_another_process_commits(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "jobs.sqlite3"
            JobStore(path).create("job-17", revision=4, artifacts=["extract"])
            snapshot_a = JobStore(path).read("job-17")
            snapshot_b = JobStore(path).read("job-17")
            command = [sys.executable, "-m", "document_intelligence.jobs",
                       "--database", str(path), "--job", "job-17",
                       "--expected-revision", str(snapshot_b["revision"]),
                       "--artifact", "extract", "--artifact", "index", "--state", "running"]
            worker_b = subprocess.run(command, capture_output=True, text=True, timeout=10)
            self.assertEqual(worker_b.returncode, 0, worker_b.stderr)
            self.assertTrue(json.loads(worker_b.stdout)["advanced"])
            self.assertFalse(JobStore(path).advance("job-17", snapshot_a["revision"],
                                                    ["extract", "stale-index"], "running"))
            reopened = JobStore(path).read("job-17")
            self.assertEqual(reopened["revision"], 5)
            self.assertEqual(reopened["artifacts"], ["extract", "index"])

    def test_synchronized_stale_json_snapshots_can_lose_a_completed_stage(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "checkpoint.json"
            worker_a, worker_b = CheckpointStore(path), CheckpointStore(path)
            snapshot_a, snapshot_b = worker_a.read(), worker_b.read()
            with patch.object(worker_b, "read", return_value=snapshot_b):
                worker_b.complete("index", "index-artifact")
            with patch.object(worker_a, "read", return_value=snapshot_a):
                worker_a.complete("extract", "extract-artifact")
            self.assertEqual(CheckpointStore(path).read()["completed"],
                             {"extract": "extract-artifact"})

    def test_terminal_record_cannot_be_advanced_to_more_work(self):
        with tempfile.TemporaryDirectory() as directory:
            store = JobStore(Path(directory) / "jobs.sqlite3")
            store.create("job-17", state="cancelled")
            self.assertFalse(store.advance("job-17", 0, ["index"], "running"))
            self.assertEqual(store.read("job-17")["state"], "cancelled")

    def test_invalid_record_does_not_replace_valid_state(self):
        with tempfile.TemporaryDirectory() as directory:
            store = JobStore(Path(directory) / "jobs.sqlite3")
            store.create("job-17")
            with self.assertRaises(ValueError):
                store.advance("job-17", 0, ["index", "index"], "succeeded")
            with self.assertRaises(ValueError):
                store.advance("job-17", 0, ["index"], "invented-state")
            self.assertEqual(store.read("job-17")["revision"], 0)


if __name__ == "__main__":
    unittest.main()
