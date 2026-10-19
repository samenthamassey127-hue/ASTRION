"""Typed API models for the ASTRION Milestone 1 backend scaffold.

These models describe the API contract only. Propagation, catalog ingestion, and
close-approach computation are intentionally deferred to later milestones.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class OrbitalElements(BaseModel):
    """Classical orbital elements at a given epoch."""

    model_config = ConfigDict(extra="forbid")

    epoch: datetime
    inclination_deg: float = Field(ge=0, le=180)
    raan_deg: float = Field(ge=0, lt=360)
    eccentricity: float = Field(ge=0, lt=1)
    argument_of_perigee_deg: float = Field(ge=0, lt=360)
    mean_anomaly_deg: float = Field(ge=0, lt=360)
    mean_motion_revolutions_per_day: float = Field(gt=0)


class SatelliteMetadata(BaseModel):
    """Identifying metadata for a catalogued satellite."""

    model_config = ConfigDict(extra="forbid")

    norad_id: int = Field(gt=0)
    name: str = Field(min_length=1)
    international_designator: str | None = None
    object_type: str | None = None
    country: str | None = None
    orbital_elements: OrbitalElements | None = None


class PropagationRequest(BaseModel):
    """Request to propagate a satellite state over a time interval."""

    model_config = ConfigDict(extra="forbid")

    satellite_id: int = Field(gt=0)
    start_time: datetime
    end_time: datetime
    step_seconds: float = Field(gt=0)


class PropagatedState(BaseModel):
    """A position and velocity sample returned by propagation."""

    model_config = ConfigDict(extra="forbid")

    timestamp: datetime
    position_km: tuple[float, float, float]
    velocity_km_per_s: tuple[float, float, float]


class PropagationResponse(BaseModel):
    """Propagation result envelope."""

    model_config = ConfigDict(extra="forbid")

    satellite_id: int = Field(gt=0)
    states: list[PropagatedState] = Field(default_factory=list)
    status: Literal["pending", "complete", "unavailable"] = "pending"


class CloseApproachAnalysisMetadata(BaseModel):
    """Metadata describing a future close-approach analysis."""

    model_config = ConfigDict(extra="forbid")

    analysis_id: str = Field(min_length=1)
    primary_satellite_id: int = Field(gt=0)
    secondary_satellite_id: int = Field(gt=0)
    created_at: datetime
    analysis_window_start: datetime
    analysis_window_end: datetime
    status: Literal["pending", "complete", "unavailable"] = "pending"


class HealthResponse(BaseModel):
    """Service liveness response."""

    status: Literal["ok"] = "ok"


class CatalogResponse(BaseModel):
    """Catalog response, including an explicit unpopulated state."""

    status: Literal["placeholder", "available"] = "placeholder"
    satellites: list[SatelliteMetadata] = Field(default_factory=list)
    source: str = "not_configured"
    message: str = "Satellite catalogue is not populated yet."
