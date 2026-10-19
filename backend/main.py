"""FastAPI application entry point for ASTRION Milestone 1."""

from fastapi import FastAPI

from .models import CatalogResponse, HealthResponse

app = FastAPI(title="ASTRION API", version="0.1.0")


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """Report that the API process is available."""

    return HealthResponse()


@app.get("/api/catalog", response_model=CatalogResponse)
def catalog() -> CatalogResponse:
    """Return the intentionally empty catalog scaffold."""

    return CatalogResponse()
