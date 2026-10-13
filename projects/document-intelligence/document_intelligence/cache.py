from time import monotonic
from typing import Generic, TypeVar

T = TypeVar("T")


class TTLCache(Generic[T]):
    def __init__(self, capacity: int = 128, ttl_seconds: float = 30.0):
        if capacity < 1 or ttl_seconds <= 0:
            raise ValueError("capacity and ttl_seconds must be positive")
        self.capacity = capacity
        self.ttl_seconds = ttl_seconds
        self._items: dict[str, tuple[float, T]] = {}
        self.hits = 0
        self.misses = 0

    def get(self, key: str) -> T | None:
        entry = self._items.get(key)
        if entry is None or entry[0] <= monotonic():
            self._items.pop(key, None)
            self.misses += 1
            return None
        self.hits += 1
        return entry[1]

    def put(self, key: str, value: T) -> None:
        if key not in self._items and len(self._items) >= self.capacity:
            oldest = min(self._items, key=lambda item: self._items[item][0])
            del self._items[oldest]
        self._items[key] = (monotonic() + self.ttl_seconds, value)
