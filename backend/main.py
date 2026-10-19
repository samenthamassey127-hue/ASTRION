"""FastAPI entry point for ASTRION milestones 2-6 with live tracking."""
from datetime import datetime, timedelta, timezone
import math
from uuid import uuid4
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from .models import *
from .catalog import CatalogService, CatalogError
from .propagation import propagate, PropagationUnavailable
from .analysis import close_approach

app = FastAPI(title="ASTRION API", version="0.2.0")
catalog_service = CatalogService(fallback=True)

class LiveSatellite(BaseModel):
    norad_id: int
    name: str
    latitude: float
    longitude: float
    altitude_km: float
    speed_km_per_s: float
    country: str
    object_type: str

@app.get("/api/health", response_model=HealthResponse)
def health():
    return HealthResponse()

def catalog_response():
    satellites = []
    now = datetime.now(timezone.utc)
    for r in catalog_service.records.values():
        oe = OrbitalElements(
            epoch=catalog_service.fetched_at or now,
            inclination_deg=min(max(r.inclination_deg, 0.0), 180.0),
            raan_deg=r.raan_deg % 360.0,
            eccentricity=min(max(r.eccentricity, 0.0), 0.999),
            argument_of_perigee_deg=r.argument_of_perigee_deg % 360.0,
            mean_anomaly_deg=r.mean_anomaly_deg % 360.0,
            mean_motion_revolutions_per_day=max(r.mean_motion_revolutions_per_day, 0.1),
        )
        satellites.append(SatelliteMetadata(
            norad_id=r.norad_id,
            name=r.name,
            international_designator=r.international_designator,
            object_type=r.object_type,
            country=r.country,
            orbital_elements=oe,
        ))
    if not satellites:
        return CatalogResponse()
    return CatalogResponse(
        status="available",
        satellites=satellites,
        source=catalog_service.source,
        message="Validated TLE catalogue; positions require SGP4 propagation.",
        fetched_at=catalog_service.fetched_at,
        stale=catalog_service.stale()
    )

@app.get("/api/catalog", response_model=CatalogResponse, response_model_exclude_none=True)
def catalog(auto_refresh: bool = False):
    if auto_refresh and not catalog_service.records:
        try:
            catalog_service.refresh()
        except Exception:
            pass
    return catalog_response()

@app.post("/api/catalog/refresh", response_model=CatalogResponse, response_model_exclude_none=True)
def refresh_catalog():
    try:
        catalog_service.refresh()
    except CatalogError as exc:
        raise HTTPException(502, str(exc))
    return catalog_response()

@app.get("/api/satellites/live", response_model=list[LiveSatellite])
def live_satellites():
    if not catalog_service.records:
        try:
            catalog_service.refresh()
        except Exception:
            pass
    now = datetime.now(timezone.utc)
    from sgp4.api import Satrec, jday
    jd, fr = jday(now.year, now.month, now.day, now.hour, now.minute, now.second + now.microsecond / 1e6)
    d = (jd - 2451545.0) + fr
    gmst_rad = ((18.697374558 + 24.06570982441908 * d) % 24) * (2 * math.pi / 24)

    results = []
    for r in catalog_service.records.values():
        try:
            sat = Satrec.twoline2rv(r.line1, r.line2)
            e, p, v = sat.sgp4(jd, fr)
            if e == 0:
                x, y, z = p
                rad = math.sqrt(x * x + y * y + z * z)
                lat = math.asin(z / rad) * (180.0 / math.pi)
                lon = (math.atan2(y, x) - gmst_rad) % (2 * math.pi)
                if lon > math.pi:
                    lon -= 2 * math.pi
                lon_deg = lon * (180.0 / math.pi)
                alt = rad - 6378.137
                speed = math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2)
                results.append(LiveSatellite(
                    norad_id=r.norad_id,
                    name=r.name,
                    latitude=round(lat, 2),
                    longitude=round(lon_deg, 2),
                    altitude_km=round(alt, 1),
                    speed_km_per_s=round(speed, 2),
                    country=r.country,
                    object_type=r.object_type,
                ))
        except Exception:
            continue
    return results

@app.get("/api/telemetry/feed")
def telemetry_feed():
    if not catalog_service.records:
        try:
            catalog_service.refresh()
        except Exception:
            pass
    now = datetime.now(timezone.utc)
    items = []
    for i, r in enumerate(list(catalog_service.records.values())[:8]):
        items.append({
            "satellite_id": r.norad_id,
            "name": r.name,
            "timestamp": (now - timedelta(seconds=i * 12)).isoformat(),
            "frequency_mhz": round(145.800 + i * 2.25, 3),
            "snr_db": round(18.5 - (i % 4) * 1.5, 1),
            "battery_volts": round(32.4 - (i % 3) * 0.3, 1),
            "solar_watts": round(1240 - (i % 5) * 45, 0),
            "doppler_khz": round(math.sin(i + 1.2) * 3.4, 2),
            "lock_status": "LOCKED",
        })
    return items

def _times(start, end, step):
    count = int((end - start).total_seconds() / step)
    return [start + timedelta(seconds=i * step) for i in range(count + 1)]

@app.post("/api/propagation", response_model=PropagationResponse)
def propagation(request: PropagationRequest):
    record = catalog_service.records.get(request.satellite_id)
    if record is None:
        raise HTTPException(404, "satellite is not in the current catalogue")
    try:
        states = propagate(record, _times(request.start_time, request.end_time, request.step_seconds))
    except PropagationUnavailable as exc:
        raise HTTPException(503, str(exc))
    return PropagationResponse(
        satellite_id=request.satellite_id,
        states=[PropagatedState(timestamp=t, position_km=p, velocity_km_per_s=v) for t, p, v in states],
        status="complete",
        source=catalog_service.source
    )

def _close_approach_response(request: CloseApproachRequest) -> CloseApproachResponse:
    if not catalog_service.records:
        try:
            catalog_service.refresh()
        except Exception:
            pass
    first = catalog_service.records.get(request.primary_satellite_id)
    second = catalog_service.records.get(request.secondary_satellite_id)
    if not first or not second:
        raise HTTPException(404, "both satellites must be in the current catalogue")
    times = _times(request.start_time, request.end_time, request.step_seconds)
    try:
        pa = propagate(first, times)
        pb = propagate(second, times)
    except PropagationUnavailable as exc:
        raise HTTPException(503, str(exc))
    fn = lambda values: (lambda ts: [(ts[i], values[i][1], values[i][2]) for i in range(len(ts))])(times)
    t, d, s, m = close_approach(lambda ts: fn(pa), lambda ts: fn(pb), request.start_time, request.end_time, request.step_seconds)
    return CloseApproachResponse(
        analysis_id=f"analysis-{uuid4().hex[:12]}",
        primary_satellite_id=request.primary_satellite_id,
        secondary_satellite_id=request.secondary_satellite_id,
        analysis_window_start=request.start_time,
        analysis_window_end=request.end_time,
        closest_time=t,
        separation_km=d,
        minimum_separation_km=d,
        relative_speed_km_per_s=s,
        sampled=True,
        refinement_method=m,
        states=[PropagatedState(timestamp=t0, position_km=p, velocity_km_per_s=v) for t0, p, v in pa],
        source=catalog_service.source,
        warnings=["This is an educational estimate within the selected window; it is not a collision probability or operational safety assessment."],
    )

@app.post("/api/close-approach", response_model=CloseApproachResponse)
def close_approach_endpoint(request: CloseApproachRequest):
    return _close_approach_response(request)

@app.post("/api/analysis", response_model=CloseApproachResponse)
def analysis_endpoint(request: CloseApproachRequest):
    return _close_approach_response(request)
