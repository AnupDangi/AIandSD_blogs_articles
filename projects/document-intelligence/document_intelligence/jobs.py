"""A local SQLite compare-and-swap lab, without a hosted queue or remote effects."""

import argparse
from contextlib import closing
import json
from pathlib import Path
import sqlite3
import subprocess
import sys
import tempfile

STATES = {"queued", "running", "waiting", "succeeded", "failed", "cancelled"}


def validate_record(revision: int, artifacts: list[str], state: str) -> None:
    if type(revision) is not int or revision < 0:
        raise ValueError("Revision must be a non-negative integer")
    if (not isinstance(artifacts, list)
            or any(not isinstance(item, str) or not item.strip() for item in artifacts)
            or len(set(artifacts)) != len(artifacts)):
        raise ValueError("Artifacts must be distinct, nonempty string identifiers")
    if state not in STATES:
        raise ValueError("Unknown job state")


class JobStore:
    """Advance a local job record only at the caller's expected revision.

    This transaction covers the job state and its artifact references. It does
    not cover the artifact contents or a separate external operation.
    """

    def __init__(self, path: Path):
        self.path = path
        path.parent.mkdir(parents=True, exist_ok=True)
        with closing(sqlite3.connect(path)) as database:
            database.execute(
                "CREATE TABLE IF NOT EXISTS jobs (job_id TEXT PRIMARY KEY, "
                "revision INTEGER NOT NULL CHECK(revision >= 0), "
                "artifacts TEXT NOT NULL, state TEXT NOT NULL)"
            )
            database.commit()

    def create(self, job_id: str, revision: int = 0, artifacts: list[str] | None = None,
               state: str = "running") -> None:
        if not isinstance(job_id, str) or not job_id.strip():
            raise ValueError("Job ID is required")
        artifacts = [] if artifacts is None else artifacts
        validate_record(revision, artifacts, state)
        with closing(sqlite3.connect(self.path)) as database, database:
            database.execute("INSERT INTO jobs VALUES (?, ?, ?, ?)",
                             (job_id, revision, json.dumps(artifacts), state))

    def read(self, job_id: str) -> dict[str, object]:
        with closing(sqlite3.connect(self.path)) as database:
            row = database.execute(
                "SELECT revision, artifacts, state FROM jobs WHERE job_id = ?", (job_id,)
            ).fetchone()
        if row is None:
            raise KeyError("Job does not exist")
        artifacts = json.loads(row[1])
        validate_record(row[0], artifacts, row[2])
        return {"job_id": job_id, "revision": row[0], "artifacts": artifacts, "state": row[2]}

    def advance(self, job_id: str, expected_revision: int, artifacts: list[str], state: str) -> bool:
        validate_record(expected_revision, artifacts, state)
        with closing(sqlite3.connect(self.path)) as database, database:
            result = database.execute(
                "UPDATE jobs SET revision = revision + 1, artifacts = ?, state = ? "
                "WHERE job_id = ? AND revision = ? AND state IN ('queued', 'running', 'waiting')",
                (json.dumps(artifacts), state, job_id, expected_revision),
            )
            return result.rowcount == 1


def demonstrate() -> dict[str, object]:
    with tempfile.TemporaryDirectory(prefix="learnlikeadev-revision-") as directory:
        path = Path(directory) / "jobs.sqlite3"
        store = JobStore(path)
        store.create("job-17", revision=4, artifacts=["extract"])
        snapshots = {worker: store.read("job-17") for worker in ("A", "B")}
        reports = {}
        # Force B to commit first while A retains the earlier revision-4 snapshot.
        for worker, artifact in (("B", "index"), ("A", "stale-index")):
            command = [sys.executable, "-m", "document_intelligence.jobs", "--database", str(path),
                       "--job", "job-17", "--expected-revision", str(snapshots[worker]["revision"]),
                       "--artifact", "extract", "--artifact", artifact, "--state", "running"]
            result = subprocess.run(command, capture_output=True, text=True, timeout=10)
            if result.returncode != 0:
                raise RuntimeError("Fixture worker failed: " + result.stderr)
            reports[worker] = json.loads(result.stdout)
        reopened = JobStore(path).read("job-17")
    return {
        "snapshots": snapshots, "workers": reports, "reopened": reopened,
        "limitations": (
            "The fixture forces a stale-snapshot interleaving across separate Python processes. "
            "SQLite protects this record only; it supplies no durable queue, lease, deadline, "
            "cancellation polling, or exactly-once guarantee for external effects."
        ),
    }


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--demo", action="store_true")
    parser.add_argument("--database", type=Path)
    parser.add_argument("--job", default="job-17")
    parser.add_argument("--expected-revision", type=int)
    parser.add_argument("--artifact", action="append", default=[])
    parser.add_argument("--state", choices=sorted(STATES), default="succeeded")
    args = parser.parse_args(argv)
    if args.demo:
        report = demonstrate()
    else:
        if args.database is None or args.expected_revision is None:
            parser.error("--database and --expected-revision are required unless --demo is used")
        store = JobStore(args.database)
        advanced = store.advance(args.job, args.expected_revision, args.artifact, args.state)
        report = {"advanced": advanced, "record": store.read(args.job)}
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
