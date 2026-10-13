import json
import os
from pathlib import Path
from tempfile import NamedTemporaryFile


class CheckpointStore:
    """Replace a sequential worker's checkpoint file atomically.

    This does not atomically couple an external effect to its completion marker,
    coordinate concurrent writers, or guarantee persistence after power loss.
    """

    def __init__(self, path: Path):
        self.path = path

    def read(self) -> dict[str, object]:
        if not self.path.exists():
            return {"completed": {}}
        value = json.loads(self.path.read_text(encoding="utf-8"))
        if not isinstance(value, dict) or not isinstance(value.get("completed"), dict):
            raise ValueError("Checkpoint data is invalid")
        return value

    def complete(self, stage_id: str, result: object) -> object:
        state = self.read()
        completed = state["completed"]
        if stage_id in completed:
            return completed[stage_id]
        completed[stage_id] = result
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with NamedTemporaryFile("w", encoding="utf-8", dir=self.path.parent, delete=False) as handle:
            json.dump(state, handle, sort_keys=True)
            temporary = Path(handle.name)
        os.replace(temporary, self.path)
        return result
