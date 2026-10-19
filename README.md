# ASTRION · Orbital Intelligence Workspace

ASTRION is an educational orbital-intelligence prototype. The default process starts with an explicit empty catalog; CelesTrak refresh, SGP4 propagation, and sampled close-approach analysis are available when the service has network access and its scientific dependencies installed.

## Architecture

- **`frontend/`**: React + TypeScript + Vite modern mission control interface for spatial overview, telemetry tracking, and observation queue.
- **`backend/`**: FastAPI backend service with validated CelesTrak TLE retrieval, SGP4/TEME propagation, sampled close-approach search, refinement metadata, and typed Pydantic contracts.

## Getting Started

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` to view the mission control workspace.

To build for production:

```bash
npm run build
```

### Backend

```bash
# Create and activate virtual environment (optional)
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -e ".[test]"
# Run FastAPI server
uvicorn backend.main:app --reload --port 8000

# Run tests
python -m pytest
```

## API workflow

1. Start the API with `uvicorn backend.main:app --reload --port 8000`.
2. `POST /api/catalog/refresh` to retrieve the selected CelesTrak stations catalogue.
3. Inspect `GET /api/catalog` for validated objects, retrieval time, source, and staleness.
4. Submit the same object IDs and an ISO-8601 UTC window to `POST /api/analysis` or `POST /api/close-approach`.
5. Treat `minimum_separation_km` as a numerical estimate within the selected interval, not as a collision probability.

## Research and demonstration notes

- [Methodology](docs/methodology.md) describes the planned CelesTrak/SGP4 workflow, conventions, search resolution, and validation strategy.
- [Limitations](docs/limitations.md) records what the scaffold does and does not claim, including empty-data and network-failure behavior.
- [Research comparison](docs/research-comparison.md) defines the comparison scope for CelesTrak SOCRATES Plus and NASA CARA.
- [Reproducible scenario](demo/scenario.json) is a machine-readable, non-result-bearing demonstration input. It does not fabricate a close approach or require network access.

The API checks can be run from the repository root after installing the test extra:

```bash
python -m pytest
```

The frontend production check can be run from the repository root (after `npm install` in `frontend/`):

```bash
npm --prefix frontend run build
```
