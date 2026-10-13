import json
from pathlib import Path
import sqlite3
import subprocess
import sys
import tempfile
import unittest

from document_intelligence.durability import run_stage


class DurabilityTests(unittest.TestCase):
    def worker(self, workspace: Path, mode: str, crash: bool = False):
        command = [sys.executable, "-m", "document_intelligence.durability",
                   "--workspace", str(workspace), "--mode", mode]
        if crash:
            command.append("--crash-after-effect")
        return subprocess.run(command, capture_output=True, text=True, timeout=10)

    def test_fresh_process_resume_deduplicates_committed_effect_before_checkpoint(self):
        with tempfile.TemporaryDirectory() as directory:
            workspace = Path(directory)
            interrupted = self.worker(workspace, "idempotent", crash=True)
            self.assertEqual(interrupted.returncode, 75, interrupted.stderr)
            self.assertFalse((workspace / "checkpoint.json").exists())
            resumed = self.worker(workspace, "idempotent")
            self.assertEqual(resumed.returncode, 0, resumed.stderr)
            result = json.loads(resumed.stdout)
            self.assertEqual(result["effects"], 1)
            self.assertEqual(result["reused_effect"], True)
            self.assertEqual(result["checkpointed"], True)
            replayed = self.worker(workspace, "idempotent")
            self.assertEqual(json.loads(replayed.stdout)["effects"], 1)

    def test_atomic_checkpoint_alone_does_not_prevent_crash_window_duplicate(self):
        with tempfile.TemporaryDirectory() as directory:
            workspace = Path(directory)
            self.assertEqual(self.worker(workspace, "unsafe", crash=True).returncode, 75)
            resumed = self.worker(workspace, "unsafe")
            self.assertEqual(resumed.returncode, 0, resumed.stderr)
            self.assertEqual(json.loads(resumed.stdout)["effects"], 2)

    def test_done_checkpoint_with_missing_artifact_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            workspace = Path(directory)
            run_stage(workspace, "idempotent")
            with sqlite3.connect(workspace / "effects.sqlite3") as database:
                database.execute("DELETE FROM effects")
            with self.assertRaisesRegex(ValueError, "missing or changed"):
                run_stage(workspace, "idempotent")

    def test_same_stage_cannot_replay_after_input_change(self):
        with tempfile.TemporaryDirectory() as directory:
            workspace = Path(directory)
            run_stage(workspace, "idempotent", artifact="index-v1")
            with self.assertRaisesRegex(ValueError, "input changed"):
                run_stage(workspace, "idempotent", artifact="index-v2")


if __name__ == "__main__":
    unittest.main()
