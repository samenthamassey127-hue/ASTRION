"""Small, validated CelesTrak TLE catalogue with explicit freshness metadata."""
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
import urllib.request

DEFAULT_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle"
@dataclass
class TLERecord:
    norad_id: int; name: str; line1: str; line2: str

class CatalogError(RuntimeError): pass

class CatalogService:
    def __init__(self, url=DEFAULT_URL, ttl_seconds=3600, timeout=10, fallback=False):
        self.url, self.ttl, self.timeout, self.fallback = url, ttl_seconds, timeout, fallback
        self.records: dict[int,TLERecord] = {}; self.fetched_at: datetime|None = None; self.source = "not_configured"
    def refresh(self) -> list[TLERecord]:
        try:
            with urllib.request.urlopen(self.url, timeout=self.timeout) as response:
                text = response.read().decode("utf-8")
            records = self.parse_tle(text)
            if not records: raise CatalogError("CelesTrak returned no valid TLE records")
            self.records = {r.norad_id:r for r in records}; self.fetched_at = datetime.now(timezone.utc); self.source="celestrak"
        except Exception as exc:
            if self.fallback:
                self.records = {r.norad_id:r for r in self.parse_tle(self.fallback_text())}; self.fetched_at=datetime.now(timezone.utc); self.source="deterministic-test-fallback"
            else: raise CatalogError(f"CelesTrak retrieval failed: {exc}") from exc
        return list(self.records.values())
    @staticmethod
    def parse_tle(text: str) -> list[TLERecord]:
        lines=[line.strip() for line in text.splitlines() if line.strip()]; out=[]; i=0
        while i+2 < len(lines):
            name,l1,l2=lines[i:i+3]
            if not (l1.startswith("1 ") and l2.startswith("2 ")): i += 1; continue
            try: norad=int(l1[2:7])
            except ValueError: i += 3; continue
            out.append(TLERecord(norad,name,l1,l2)); i += 3
        return out
    @staticmethod
    def fallback_text():
        return "TEST SATELLITE\n1 25544U 98067A   24001.00000000  .00000000  00000-0  00000-0 0  9999\n2 25544  51.6400  10.0000 0005000  20.0000  30.0000 15.50000000123456\n"
    def stale(self): return self.fetched_at is None or datetime.now(timezone.utc)-self.fetched_at > timedelta(seconds=self.ttl)
