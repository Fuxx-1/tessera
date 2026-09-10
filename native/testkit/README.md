# Private G0 Testkit

This directory is private, non-production test infrastructure. It is not a Cargo crate, does not expose product APIs, and must remain absent from normal/build/release dependencies of `tessera-core`, `tessera-iced`, and `tessera-gallery`. It is never a user runtime dependency or a release dependency.

The prototype requires **Python 3.11 or newer** and only the standard library. It has no third-party runtime dependency, package installation step, Cargo dependency, or user-facing runtime integration. `bin/validate-evidence`, `bin/run-evidence`, `bin/preflight-source`, and `bin/build-ledger` implement the frozen evidence contract and self-tests; they do not create native evidence or replace CI/lab attestation.

`coverage-g0-v1` is an immutable 216-cell G0 authority. The validator has fixed canonical and exact-file SHA-256 locks for it and its crosswalk. `run-evidence` rejects replacement authority bytes, copies the exact pair into `RUN-.../authority/`, and binds their digests in evidence, manifest, and provenance. `build-ledger` refuses anything other than the frozen files.

Only clean Git source identity is implemented. Archive identity is explicitly **UNSUPPORTED** and is not accepted by schema, CLI, runner, or validator. `preflight-source` returns nonzero for any hard failure; `run-evidence` rechecks the complete passing preflight before launching the target.

From the `native` directory, Unix/macOS calls are:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 testkit/tests/test_contract.py
PYTHONDONTWRITEBYTECODE=1 python3 testkit/bin/build-ledger \
  --catalog testkit/catalog/coverage-g0-v1.json \
  --crosswalk testkit/catalog/crosswalk-g0-v1.json \
  --evidence-root /outside/tessera/evidence \
  --out testkit/baseline/ledger-g0.json

find testkit -type d -name __pycache__ -o -type f \( -name '*.pyc' -o -name '*.pyo' \)
```

Windows PowerShell calls are:

```powershell
$env:PYTHONDONTWRITEBYTECODE = "1"
py -3.11 .\testkit\tests\test_contract.py
py -3.11 .\testkit\bin\build-ledger --catalog .\testkit\catalog\coverage-g0-v1.json --crosswalk .\testkit\catalog\crosswalk-g0-v1.json --evidence-root D:\evidence\tessera --out .\testkit\baseline\ledger-g0.json
```

Windows `py -3.11` launcher behavior, real hardware capture, and Windows runner execution are **UNVERIFIED** in this payload. The Python implementation uses `pathlib` and no Unix-only runtime dependency, but that is not a Windows validation claim. Current platform verification is limited to local contract self-tests on the present macOS development host; it is not Metal, DX12, low-spec, screen-reader, soak, or release evidence.

Shared metrics are ledger-derived by `(source identity, gate, metric ID, platform/artifact scope)`. A record cannot carry `satisfied_gates`; required metrics cannot be N/A; `shared_nightly` requires Nightly/RC and `shared_rc` requires RC. G0 evaluates only the strip example executable, gzip-executable trend, and low-spec matrix checkpoint metrics. `T-G0-018` remains cataloged only as a future boundary for G4/G6 soak and does not expand into G0 required cells. G6 evaluates a distinct signed compressed distribution metric, so a bare executable can never close the distribution-package gate.

Every completed evidence record has `supersedes_record_id`, `retest_ordinal`, and `handback_id`. The only allowed successor is one targeted retest linked to an immutable failed predecessor and matching its handback command. The ledger blocks a parallel post-failure pass.

The runner traps `SIGINT`/`SIGTERM` as soon as its run directory exists. A pre-spawn signal produces a complete `signal_trap` bundle without launching the target. A live target is created in a dedicated process group and is terminated, drained, and reaped by the main path using bounded waits; the asynchronous handler only records the first signal. The self-test uses a controlled spawn barrier plus an atomically published child-ready PID marker (same-directory temporary file, then `os.replace`), runs 20 before-spawn and 20 during-child signal races, and asserts full evidence/manifest/provenance/validation envelopes and no surviving POSIX child PID. This local macOS contract result is not Windows, trusted signer, hardware, screen-reader, low-spec, 6-hour, or 24-hour evidence.

The self-test also rejects delivery-tree `__pycache__`, `.pyc/.pyo`, `target/`, `tmp/`, `cache/`, and files larger than 5 MiB anywhere below `native/`. The v6 local contract result and repair-file hashes are recorded in `baseline/repair-v6-result.json`; `repair-v5-result.json` remains the historical input provenance record and is not the active authority after the v6 traceability repair.
