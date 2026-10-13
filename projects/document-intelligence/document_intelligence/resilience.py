from collections.abc import Callable
from time import monotonic, sleep
from typing import TypeVar

T = TypeVar("T")


def bounded_retry(operation: Callable[[], T], *, deadline_seconds: float = 0.25, max_attempts: int = 2) -> T:
    if deadline_seconds <= 0 or max_attempts < 1:
        raise ValueError("A positive deadline and at least one attempt are required")
    deadline = monotonic() + deadline_seconds
    last_error: Exception | None = None
    for attempt in range(max_attempts):
        if monotonic() >= deadline:
            break
        try:
            return operation()
        except (TimeoutError, ConnectionError) as error:
            last_error = error
            if attempt + 1 < max_attempts:
                sleep(min(0.01 * (2**attempt), max(deadline - monotonic(), 0)))
    if last_error:
        raise last_error
    raise TimeoutError("The operation deadline elapsed before an attempt started")
