"""Pydantic contracts for the ASTRION backend."""
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator

class OrbitalElements(BaseModel):
    model_config = ConfigDict(extra="forbid")
    epoch: datetime
    inclination_deg: float = Field(ge=0, le=180)
    raan_deg: float = Field(ge=0, lt=360)
    eccentricity: float = Field(ge=0, lt=1)
    argument_of_perigee_deg: float = Field(ge=0, lt=360)
    mean_anomaly_deg: float = Field(ge=0, lt=360)
    mean_motion_revolutions_per_day: float = Field(gt=0)

class SatelliteMetadata(BaseModel):
    model_config = ConfigDict(extra="forbid")
    norad_id: int = Field(gt=0)
    name: str = Field(min_length=1)
    international_designator: str | None = None
    object_type: str | None = None
    country: str | None = None
    orbital_elements: OrbitalElements | None = None

class PropagationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    satellite_id: int = Field(gt=0)
    start_time: datetime
    end_time: datetime
    step_seconds: float = Field(gt=0, le=86400)
    @model_validator(mode="after")
    def ordered(self):
        if self.end_time < self.start_time: raise ValueError("end_time must be after start_time")
        return self

class PropagatedState(BaseModel):
    model_config = ConfigDict(extra="forbid")
    timestamp: datetime
    frame: Literal["TEME"] = "TEME"
    position_km: tuple[float, float, float]
    velocity_km_per_s: tuple[float, float, float]

class PropagationResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    satellite_id: int = Field(gt=0)
    states: list[PropagatedState] = Field(default_factory=list)
    status: Literal["pending", "complete", "unavailable"] = "pending"
    source: str = "celestrak"
    model: str = "SGP4"

class CloseApproachRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    primary_satellite_id: int = Field(gt=0)
    secondary_satellite_id: int = Field(gt=0)
    start_time: datetime
    end_time: datetime
    step_seconds: float = Field(gt=0, le=86400)
    @model_validator(mode="after")
    def valid(self):
        if self.primary_satellite_id == self.secondary_satellite_id: raise ValueError("satellites must differ")
        if self.end_time < self.start_time: raise ValueError("end_time must be after start_time")
        return self

class CloseApproachResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    analysis_id: str
    status: Literal["complete", "unavailable"] = "complete"
    primary_satellite_id: int
    secondary_satellite_id: int
    analysis_window_start: datetime
    analysis_window_end: datetime
    closest_time: datetime
    separation_km: float = Field(ge=0)
    minimum_separation_km: float = Field(ge=0)
    relative_speed_km_per_s: float = Field(ge=0)
    sampled: bool
    refinement_method: str
    states: list[PropagatedState] = Field(default_factory=list)
    source: str = "celestrak"
    model: str = "SGP4"
    warnings: list[str] = Field(default_factory=list)

class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"

class CatalogResponse(BaseModel):
    status: Literal["placeholder", "available"] = "placeholder"
    satellites: list[SatelliteMetadata] = Field(default_factory=list)
    source: str = "not_configured"
    message: str = "Satellite catalogue is not populated yet."
    fetched_at: datetime | None = None
    stale: bool | None = None
