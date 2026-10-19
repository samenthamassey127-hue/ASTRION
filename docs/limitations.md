# ASTRION limitations and failure behavior

## Current milestone

`GET /api/health` reports process liveness. At startup, `GET /api/catalog` returns `status: "placeholder"`, `satellites: []`, `source: "not_configured"`, and the message `Satellite catalogue is not populated yet.` `POST /api/catalog/refresh` retrieves and parses CelesTrak TLEs; propagation uses the declared SGP4 dependency; close approach samples the interval and may apply bounded interpolation refinement. There is no covariance, probability-of-collision, or high-fidelity force model.

## Empty data

An empty catalog is a valid explicit state, not evidence that no satellites exist and not a zero-risk conclusion. Consumers should keep the placeholder status visible, avoid calculating derived metrics, and ask for a configured source or fixture. The reproducible demo deliberately starts in this state.

## Network and source failures

The process does not make a network request at startup. A refresh DNS, timeout, HTTP, rate-limit, or malformed-record failure returns an HTTP 502 and leaves the catalog unavailable unless a caller explicitly configures the deterministic test fallback. It is not converted into an empty successful refresh or silently filled with fabricated data. Propagation returns HTTP 503 when `sgp4` is unavailable; missing catalog objects return HTTP 404. A reproducible offline run should use a versioned local fixture and label it as such.

## Scientific limitations

- SGP4/GP elements have finite source accuracy and age; propagated states diverge as the element epoch becomes stale.
- A TLE/OMM propagation is not an operational conjunction assessment, covariance solution, maneuver forecast, or probability-of-collision calculation.
- Coarse sampling and numerical/interpolation choices can miss or shift a close approach. A reported minimum is an estimate at the declared resolution and refinement tolerance.
- Frame conversion depends on Earth-orientation data and conventions. Results are not comparable unless frame, time scale, and conversion policy match.
- Public catalog identity, launch metadata, and object status can change; every run needs a retrieval timestamp and source record.

No accuracy, completeness, latency, or performance guarantee is made by this milestone.
