from datetime import datetime, timezone, timedelta
from backend.catalog import CatalogService
from backend.analysis import close_approach

TLE = """ISS (ZARYA)
1 25544U 98067A   24001.00000000  .00000000  00000-0  00000-0 0  9999
2 25544  51.6400  10.0000 0005000  20.0000  30.0000 15.50000000123456
"""

def test_tle_parser_validates_selected_catalogue():
    records = CatalogService.parse_tle(TLE)
    assert len(records) == 1 and records[0].norad_id == 25544

def test_close_approach_refines_synthetic_crossing():
    start = datetime(2024, 1, 1, tzinfo=timezone.utc)
    def trajectory(offset, velocity):
        def sample(times):
            return [(t, (offset + velocity*(t-start).total_seconds(), 0.0, 0.0), (velocity, 0.0, 0.0)) for t in times]
        return sample
    t, distance, speed, method = close_approach(trajectory(-5, 1), trajectory(5, -1), start, start + timedelta(seconds=10), 2)
    assert abs((t-start).total_seconds()-5) < 1
    assert distance < 1
    assert speed == 2
    assert "interpolation" in method
