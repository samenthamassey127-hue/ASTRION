# Research comparison scope

This comparison is a study design, not a claim that ASTRION reproduces either reference system. The current ASTRION backend has no live catalog or conjunction-analysis implementation.

## CelesTrak SOCRATES Plus

[SOCRATES Plus](https://celestrak.org/SOCRATES/) is the closest comparison in subject matter: public two-line-element-based screening and close-approach reporting. A future comparison should use the same object set, source retrieval window, analysis interval, screening threshold, time step, and frame/unit conventions. Compare candidate identity, time of closest approach, miss distance, and handling of unavailable inputs. Differences can arise from element snapshots, propagator/library versions, screening and refinement algorithms, and operational filtering. A matching row is not proof of independent accuracy.

## NASA CARA

[NASA CARA](https://www.nasa.gov/organizations/space-communications-navigation-program/space-safety/) represents an operational spaceflight-safety context rather than a drop-in public API oracle. A meaningful comparison must distinguish publicly described guidance and operational conjunction assessment practices from any particular internal data, covariance, screening, or notification product. ASTRION's planned SGP4 pairwise estimate does not claim CARA-equivalent fidelity, uncertainty treatment, or decision authority.

## Reproducible comparison protocol

For each run, archive the exact input records, retrieval times, software/dependency versions, analysis window, threshold, coarse step, refinement settings, frame, time scale, and units. Report only metrics supported by both sides: input coverage, candidate overlap, time difference, and miss-distance difference. Treat missing, stale, malformed, or network-failed inputs as unavailable and report them separately. Do not infer accuracy from a small sample or from agreement with one reference output.

The checked-in `demo/scenario.json` provides a safe parameter template and expected empty-data behavior; it contains no claimed SOCRATES Plus or NASA CARA result.
