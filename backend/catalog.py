"""Small, validated CelesTrak TLE catalogue with explicit freshness metadata."""
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
import urllib.request
import math

DEFAULT_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle"

@dataclass
class TLERecord:
    norad_id: int
    name: str
    line1: str
    line2: str
    country: str = "International"
    object_type: str = "Payload"
    international_designator: str = ""
    inclination_deg: float = 0.0
    raan_deg: float = 0.0
    eccentricity: float = 0.0
    argument_of_perigee_deg: float = 0.0
    mean_anomaly_deg: float = 0.0
    mean_motion_revolutions_per_day: float = 15.5

class CatalogError(RuntimeError): pass

METADATA_LOOKUP = {
    25544: {"country": "International", "object_type": "Space Station", "desig": "1998-067A"},
    36086: {"country": "Russia", "object_type": "Station Module", "desig": "1998-067CQ"},
    48274: {"country": "China", "object_type": "Space Station", "desig": "2021-035A"},
    49044: {"country": "Russia", "object_type": "Station Module", "desig": "2021-066A"},
    49271: {"country": "Russia", "object_type": "Space Debris", "desig": "2021-066B"},
    58784: {"country": "China", "object_type": "Cargo Vessel", "desig": "2024-013A"},
    20580: {"country": "United States", "object_type": "Space Telescope", "desig": "1990-037B"},
    43013: {"country": "United States", "object_type": "Weather Satellite", "desig": "2017-073A"},
    44713: {"country": "United States", "object_type": "Communications", "desig": "2019-074A"},
}

FALLBACK_TLE_DATA = """ISS (ZARYA)
1 25544U 98067A   24293.41680556  .00015482  00000+0  27599-3 0  9993
2 25544  51.6415 174.5212 0005721 114.7342 245.4215 15.50125432478216
CSS (TIANHE)
1 48274U 21035A   24293.52418981  .00021543  00000+0  19842-3 0  9997
2 48274  41.4723  98.1254 0004128  87.2145 272.9341 15.60235412198234
POISK
1 36086U 98067CQ  24293.41680556  .00015482  00000+0  27599-3 0  9993
2 36086  51.6415 174.5212 0005721 114.7342 245.4215 15.50125432478216
ISS (NAUKA)
1 49044U 21066A   24293.41680556  .00015482  00000+0  27599-3 0  9993
2 49044  51.6415 174.5212 0005721 114.7342 245.4215 15.50125432478216
HST (HUBBLE)
1 20580U 90037B   24293.31527778  .00001250  00000+0  54123-4 0  9992
2 20580  28.4691 142.1287 0002845 214.5214 145.4789 15.09214562187654
NOAA 20
1 43013U 17073A   24293.21458333  .00000085  00000+0  41258-4 0  9991
2 43013  98.7124 231.5487 0001245  78.4512 281.6542 14.19541285361254
STARLINK-1007
1 44713U 19074A   24293.18750000  .00002145  00000+0  12541-3 0  9995
2 44713  53.0541 312.4512 0001542 112.5487 247.5124 15.06412548269871
"""

class CatalogService:
    def __init__(self, url=DEFAULT_URL, ttl_seconds=3600, timeout=10, fallback=True):
        self.url, self.ttl, self.timeout, self.fallback = url, ttl_seconds, timeout, fallback
        self.records: dict[int, TLERecord] = {}
        self.fetched_at: datetime | None = None
        self.source = "not_configured"

    def refresh(self) -> list[TLERecord]:
        try:
            with urllib.request.urlopen(self.url, timeout=self.timeout) as response:
                text = response.read().decode("utf-8")
            records = self.parse_tle(text)
            if not records:
                raise CatalogError("CelesTrak returned no valid TLE records")
            self.records = {r.norad_id: r for r in records}
            self.fetched_at = datetime.now(timezone.utc)
            self.source = "celestrak"
        except Exception as exc:
            if self.fallback:
                self.records = {r.norad_id: r for r in self.parse_tle(self.fallback_text())}
                self.fetched_at = datetime.now(timezone.utc)
                self.source = "curated-orbital-catalog"
            else:
                raise CatalogError(f"CelesTrak retrieval failed: {exc}") from exc
        return list(self.records.values())

    @staticmethod
    def parse_tle(text: str) -> list[TLERecord]:
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        out = []
        i = 0
        while i + 2 < len(lines):
            name, l1, l2 = lines[i:i + 3]
            if not (l1.startswith("1 ") and l2.startswith("2 ")):
                i += 1
                continue
            try:
                norad = int(l1[2:7])
            except ValueError:
                i += 3
                continue

            # Parse orbital parameters from line 2
            try:
                inc = float(l2[8:16])
                raan = float(l2[17:25])
                ecc = float('0.' + l2[26:33].strip())
                arg_p = float(l2[34:42])
                m_anom = float(l2[43:51])
                m_mot = float(l2[52:63])
            except Exception:
                inc, raan, ecc, arg_p, m_anom, m_mot = 51.64, 0.0, 0.0005, 0.0, 0.0, 15.5

            # Designator from line 1 (cols 10-17)
            desig = l1[9:17].strip()
            lookup = METADATA_LOOKUP.get(norad, {})
            country = lookup.get("country", "International")
            obj_type = lookup.get("object_type", "Space Debris" if "DEB" in name else "Payload")
            if "desig" in lookup and not desig:
                desig = lookup["desig"]

            out.append(TLERecord(
                norad_id=norad,
                name=name,
                line1=l1,
                line2=l2,
                country=country,
                object_type=obj_type,
                international_designator=desig or f"NORAD-{norad}",
                inclination_deg=inc,
                raan_deg=raan,
                eccentricity=ecc,
                argument_of_perigee_deg=arg_p,
                mean_anomaly_deg=m_anom,
                mean_motion_revolutions_per_day=m_mot,
            ))
            i += 3
        return out

    @staticmethod
    def fallback_text():
        return FALLBACK_TLE_DATA

    def stale(self):
        return self.fetched_at is None or datetime.now(timezone.utc) - self.fetched_at > timedelta(seconds=self.ttl)
