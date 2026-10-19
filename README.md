# ASTRION · Orbital Intelligence Workspace

ASTRION is an orbital intelligence and satellite tracking platform scaffold (Milestone 1).

## Architecture

- **`frontend/`**: React + TypeScript + Vite modern mission control interface for spatial overview, telemetry tracking, and observation queue.
- **`backend/`**: FastAPI backend service defining typed Pydantic models for orbital propagation, satellite catalog metadata, and system health checks.

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
pytest
```
