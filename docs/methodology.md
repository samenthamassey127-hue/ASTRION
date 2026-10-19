# ASTRION methodology

## Status and scope

ASTRION starts as a typed FastAPI/React scaffold. The catalog is empty until `POST /api/catalog/refresh` succeeds; propagation and close-approach endpoints then operate on that in-memory catalog. This document describes the implemented workflow and the assumptions that still limit research use.

## Reproduce the demonstration

From the repository root:

```bash
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
# Linux/macOS: source .venv/bin/activate
python -m pip install -e ".[test]"
python -m pip install sgp4 scipy
uvicorn backend.main:app --reload --port 8000
```

In a second shell, run `python -m pytest`. The checked-in `demo/scenario.json` records the UTC window, object IDs, source URL, units, and sampling parameters. An offline baseline is `GET http://127.0.0.1:8000/api/catalog`, which should show the documented placeholder until refresh. A live refresh is `curl -X POST http://127.0.0.1:8000/api/catalog/refresh`; its result depends on network access and the current CelesTrak response.

## Data source and attribution

The planned public source is [CelesTrak](https://celestrak.org/), using its current GP/TLE or OMM catalog products. A run must record the exact URL, retrieval timestamp (UTC), response checksum or archived input, and the object identifiers used. CelesTrak data and services should be attributed to CelesTrak in reports and demonstrations; users must follow the source's terms and reasonable request limits. A network outage is not a reason to substitute invented or stale values silently.

## Propagation method

For a GP/TLE record, the planned propagator is SGP4, initialized from the two-line element set and its epoch. OMM records must be converted/handled with an implementation that preserves the source epoch and the corresponding SGP4-compatible fields. Each output should retain the source record and propagator version so that a result can be reproduced. SGP4 is an empirical near-Earth general perturbations model; it is not a high-fidelity maneuver, covariance, or collision-probability model.

The pipeline is:

1. Retrieve and validate the selected CelesTrak record.
2. Parse the epoch and element fields without changing their precision.
3. Propagate each object at the requested UTC sample times.
4. Convert the propagator's TEME state to the documented display/reference frame using the same UTC/UT1 and Earth-orientation policy for every object.
5. Compute pairwise relative position and retain the minimum over the analysis window.

## Coordinate, time, and unit conventions

- Input and output timestamps are ISO 8601 with an explicit UTC offset; stored analysis times are UTC (`Z`).
- SGP4 states are interpreted in TEME until an explicit frame conversion is applied. A result must name its final frame; ASTRION must not label TEME values as ITRF, ECEF, or an inertial frame without conversion.
- Positions are kilometres and velocities are kilometres per second, matching the API model (`position_km`, `velocity_km_per_s`).
- Angles in API orbital-element fields are degrees; mean motion is revolutions per day; eccentricity is dimensionless.
- Separation thresholds and reported miss distances are kilometres. The time basis, frame, and units belong in every exported result.

## Close-approach search and refinement

The service first samples the full interval on the requested step. It brackets the best interior sample and applies a bounded local interpolation refinement when SciPy is available (with a deterministic quadratic fallback otherwise); endpoint minima remain sampled. The response identifies the refinement method and whether the result is sampled. A coarse grid alone can miss a short-duration minimum; interpolation improves temporal resolution but does not establish physical certainty. The current endpoint does not apply the scenario's threshold as a filter, so callers must interpret `separation_km` themselves.

The demonstration scenario declares these parameters explicitly. Its `refinement_tolerance_km` is a documentation parameter; the current endpoint accepts step size but does not expose a tolerance argument.

## Validation strategy

Validation should use deterministic fixture records and frozen expected values for parser and propagator regression tests, with tolerances stated alongside each fixture. Cross-check selected propagation states against an independently run, version-pinned SGP4 implementation. Test frame conversion and UTC boundary cases separately. For close approaches, verify that reducing the coarse step and tightening refinement changes the reported minimum within a declared tolerance, and include a case whose minimum lies between coarse samples. Record source timestamps, software versions, inputs, parameters, and failures with every run.
