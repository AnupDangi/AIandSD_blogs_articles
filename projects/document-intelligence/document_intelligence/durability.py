"""A local, model-free worker crash drill; no remote side effects are executed."""

import argparse
from contextlib import closing
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
import tempfile
from uuid import uuid4

from .workflow import CheckpointStore

STAGE_ID = "publish-fixture-index"
ARTIFACT = "fixture index docs-v1 ready"
LIMITATIONS = (
    "SQLite models a durable effect service on one host. The checkpoint file is separate. "
    "This drill tests worker-process exit, not power loss, distributed transactions, "
    "concurrent checkpoint writers, or an arbitrary remote service's exactly-once behavior."
)


def run_stage(workspace: Path, mode: str, artifact: str = ARTIFACT,
              crash_after_effect: bool = False) -> dict[str, object]:
    if mode not in {"unsafe", "idempotent"}:
        raise ValueError("Unknown durability mode")
    workspace.mkdir(parents=True, exist_ok=True)
    fingerprint = hashlib.sha256(json.dumps(
        {"stage": STAGE_ID, "artifact": artifact, "mode": mode}, sort_keys=True
    ).encode()).hexdigest()
    checkpoint = CheckpointStore(workspace / "checkpoint.json")
    saved = checkpoint.read()["completed"].get(STAGE_ID)

    with closing(sqlite3.connect(workspace / "effects.sqlite3")) as database:
        database.execute(
            "CREATE TABLE IF NOT EXISTS effects "
            "(effect_key TEXT PRIMARY KEY, artifact TEXT NOT NULL, fingerprint TEXT NOT NULL)"
        )
        database.commit()
        if saved is not None:
            if not isinstance(saved, dict) or saved.get("fingerprint") != fingerprint:
                raise ValueError("Checkpoint input changed; choose a new stage/version")
            effect = database.execute(
                "SELECT artifact, fingerprint FROM effects WHERE effect_key = ?",
                (saved.get("effect_key"),),
            ).fetchone()
            if effect != (artifact, fingerprint):
                raise ValueError("Completed artifact is missing or changed; investigate before resume")
            reused = True
            effect_key = saved["effect_key"]
        else:
            # The effect service commits before the separate workflow checkpoint.
            # A stable key deduplicates a retry in this deliberately non-atomic window.
            effect_key = STAGE_ID if mode == "idempotent" else str(uuid4())
            database.execute("BEGIN IMMEDIATE")
            try:
                effect = database.execute(
                    "SELECT artifact, fingerprint FROM effects WHERE effect_key = ?",
                    (effect_key,),
                ).fetchone()
                reused = effect is not None
                if effect is not None and effect != (artifact, fingerprint):
                    raise ValueError("Effect input changed; choose a new stage/version")
                if effect is None:
                    database.execute("INSERT INTO effects VALUES (?, ?, ?)",
                                     (effect_key, artifact, fingerprint))
                database.commit()
            except Exception:
                database.rollback()
                raise
            if crash_after_effect:
                # Deliberately skip cleanup and checkpoint creation, as a killed worker would.
                os._exit(75)
            checkpoint.complete(STAGE_ID, {
                "effect_key": effect_key, "artifact": artifact, "fingerprint": fingerprint,
            })
        count = database.execute("SELECT COUNT(*) FROM effects").fetchone()[0]
    return {
        "mode": mode, "stage": STAGE_ID, "effects": count,
        "reused_effect": reused, "checkpointed": True,
        "effect_key": effect_key, "input_fingerprint": fingerprint,
        "artifact": artifact, "limitations": LIMITATIONS,
    }


def demonstrate() -> dict[str, object]:
    """Compare independent killed/resumed workers in fresh temporary workspaces."""
    reports = []
    with tempfile.TemporaryDirectory(prefix="learnlikeadev-crash-") as directory:
        for mode in ("unsafe", "idempotent"):
            workspace = Path(directory) / mode
            command = [sys.executable, "-m", "document_intelligence.durability",
                       "--workspace", str(workspace), "--mode", mode]
            interrupted = subprocess.run(command + ["--crash-after-effect"],
                                         capture_output=True, text=True, timeout=10)
            if interrupted.returncode != 75:
                raise RuntimeError("The fixture worker did not stop at its injected crash")
            absent = not (workspace / "checkpoint.json").exists()
            resumed = subprocess.run(command, capture_output=True, text=True, timeout=10)
            if resumed.returncode != 0:
                raise RuntimeError("The fixture worker could not resume: " + resumed.stderr)
            reports.append({
                "interrupted_exit": interrupted.returncode,
                "checkpoint_absent_at_crash": absent,
                "resumed": json.loads(resumed.stdout),
            })
    return {"scenarios": reports, "limitations": LIMITATIONS}


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--demo", action="store_true", help="Run killed and resumed workers")
    parser.add_argument("--workspace", type=Path)
    parser.add_argument("--mode", choices=("unsafe", "idempotent"), default="idempotent")
    parser.add_argument("--crash-after-effect", action="store_true")
    args = parser.parse_args(argv)
    if args.demo:
        result = demonstrate()
    else:
        if args.workspace is None:
            parser.error("--workspace is required unless --demo is used")
        result = run_stage(args.workspace, args.mode, crash_after_effect=args.crash_after_effect)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
