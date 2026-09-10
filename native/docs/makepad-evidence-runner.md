# Makepad Evidence Runner

Status: `IMPLEMENTED SKELETON / FAIL-CLOSED / RUNTIME EVIDENCE BLOCKED`

This runner is the private testkit boundary for Makepad evidence. It is
dependency-free Python and does not belong to the native Cargo workspace. The
only write set for this delivery is
`native/testkit/makepad-evidence-runner/**` and this document.

## Lifecycle

Every run uses one managed directory:

```text
<evidence-root>/<40-hex-revision>/<RUN-...>/
  reservation.json
  manifest.snapshot.json
  fixtures/
  capture/metadata.json
  capture/platform-probe.json
  capture/provenance.json
  artifacts/
  artifacts.json
  evidence.json
```

The state transitions are `reserved -> captured -> hashed -> sealed`. The
runner uses atomic temporary-file replacement for JSON stage files. A sealed
`evidence.json` cannot be overwritten. The record includes stage-file hashes;
validation rehashes those files and rejects any post-seal mutation.

The evidence root is caller supplied, but every artifact path is checked as a
safe relative path, with no absolute path, `..`, backslash, NUL, symlink path
component, or escape after resolution. The run id source prefix must match the
source revision prefix. Evidence outside the managed revision/run-id layout is
invalid.

## Binding Rules

`reservation.json` binds all of the following:

- 40-character source revision;
- binary SHA-256;
- canonical build-key SHA-256;
- matrix cell and ordinal;
- fixture SHA-256 and copied fixture bytes;
- manifest snapshot SHA-256;
- platform, device, theme, viewport, system scale, app scale, content,
  input, and lifecycle profiles.

The selected cell declares the complete artifact set. The validator rejects
missing artifacts, extra or duplicate artifact identities, empty files, hash
mismatches, binary hash mismatches, fixture mutation, and incomplete stage
hashes. `ordinal=0` is the initial run and `ordinal=1` is reserved for one
targeted retest; any duplicate sealed matrix signature is rejected.

## Fail-Closed Provenance

`state_only` and `synthetic` captures can be useful for debugging, but they
always seal as `BLOCKED` and are rejected as evidence. `runtime_capture` is
also blocked until an external trust-root attestation verifier is implemented.
The current runner records an optional attestation envelope for future adapter
work, but does not trust a caller-supplied JSON flag or file as proof.

The runner never generates a screenshot, AX tree, IME composition trace,
mobile install log, performance sidecar, or manual review. A real adapter must
place those artifacts in the reserved run root, bind them to the same revision,
binary, build key, fixture, and cell, and provide verifiable attestation before
the validator can return `evidence_valid=true`.

## Platform Probe

`probe-makepad-capabilities` reports host facts and separate dispositions for
macOS, Android, iOS, Windows, and Linux. Tool presence and a WindowServer
process are informational only. The current probe marks the actual capture
platform and macOS runner capability `blocked` because no trusted Makepad
GUI/AX/IME/mobile adapter is implemented. It does not claim support for any
platform and does not fabricate screenshots or device results.

The manifest uses the 12 published Makepad G0 case IDs and includes light/dark
desktop cells, mobile cells, desktop/mobile viewport and scale values,
keyboard/focus/IME, overlay, AX, 10k chart, visible 10k grid, long-document,
and motion-idle requirements. Long-document and motion-idle are represented as
profiles under the published `MARKDOWN-REJECT` and `LINECHART-10K` cases. The
fixture descriptors are deliberately small; they are not runtime evidence or
performance data.

## Commands

From the repository root:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -B -m unittest discover \
  -s native/testkit/makepad-evidence-runner/tests -v

python3 -B native/testkit/makepad-evidence-runner/bin/probe-makepad-capabilities
```

For a run, use `reserve-makepad-run`, then
`capture-makepad-metadata`, `hash-makepad-artifacts`,
`seal-makepad-run`, and finally `validate-makepad-evidence`. Validation exits
nonzero for blocked outcomes and every missing, synthetic, unverified, or
tampered artifact. The runner does not download toolchains or create long-lived
evidence output during its own tests.

## Current Blocking

This delivery proves the contract mechanics only. Real GUI capture, AX tree
and assistive-technology action round trips, CJK composition lifecycle,
keyboard/focus behavior, mobile install/touch/rotation/safe-area/soft-keyboard,
DPI geometry, 10k/long-document performance, 8-hour soak, and motion-idle
sampling remain `BLOCKED` until real platform adapters and independently
verifiable artifacts exist. A successful unit test or host probe does not close
any of those gates.
