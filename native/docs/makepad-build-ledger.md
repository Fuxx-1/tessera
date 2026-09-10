# Makepad Build Ledger

This testkit defines the shared-build contract for the Tessera Makepad route.
It is a standard-library Python implementation and is not a native runtime or
Cargo dependency.

## Managed locations

Long-lived build data is admitted only below:

- ~/Library/Caches/tessera/builds
- ~/Library/Application Support/Tessera/build-results
- ~/Library/Application Support/Tessera/evidence

The canonical target location is:

    <cache>/<authority>/<40-hex-revision>/<profile-id>/<key-sha256>/target

The result location is the same identity below build-results, and contains
key.json, build-ledger.json, and the derived build-result.json. A target under
/private/tmp, /tmp, the source tree, or unmanaged native/target is rejected.
Temporary directories are used only by the tests and are marked as fixture
roots.

## Canonical key

build-key-v1.schema.json describes the required fields. The library sorts
object keys, deduplicates and sorts features/targets/environment names, rejects
non-finite numbers and shell command strings, lowercases revision and lockfile
hashes, and replaces repository paths with $REPO. Managed paths use
$TESSERA_BUILD_CACHE, $TESSERA_BUILD_RESULTS, and $TESSERA_EVIDENCE.

The exact compact UTF-8 JSON bytes of key.json are hashed with SHA-256. The
hash is the identity used by target, result, lease, ledger, and reuse checks.

## Lease and fencing

lease creates writer.lease.json with O_CREAT|O_EXCL, a random 32-byte lease ID,
key/revision, session, PID, process-start token, host identity, and
acquire/heartbeat/expiry timestamps. Heartbeat and every ledger publication
recheck the full lease_id, key_sha256, host_id, pid, and process_start_token
fingerprint. A late writer is fenced. Expired heartbeat alone is insufficient:
stale status requires confirmed process identity absence; unknown identity,
PID reuse, sleep, incomplete records, and recovery uncertainty are retained.

## Ledger state

The only legal state sequence is:

    reserved -> running -> passed|failed -> sealed

passed is not consumable until sealed. A failed, cancelled, timeout, or
orphaned writer outcome is sealed as non-consumable. Artifacts use
artifact_id, kind, root_id, relative_path, sha256, size_bytes, media_type, and
retention_class; relative paths reject traversal, NUL, backslashes, absolute
paths, and symlinks. Directory artifacts include a bounded deterministic tree
manifest hash.

build-result.json is a derived projection. Reuse requires a sealed passed
ledger, matching key/revision/profile/lockfile, canonical result bytes, and
fresh artifact hashes. A legacy result with status=passed but no sealed ledger
is a cache miss.

## Admission

preflight records available space, volume identity/filesystem/SSD facts,
estimated peak, target path, lockfile hash, renderer/backend via the canonical
key, and CARGO_BUILD_JOBS=2. New writers are rejected when SSD/volume identity
is incomplete or unknown, available space is below max(30 GiB, 2 * estimated_peak),
system pressure is critical, or any managed path/key/lockfile/command check
fails. CLI production roots are fixed to the locations above; temporary test
roots must use `--fixture-root`. The GC emergency watermark of 5 GiB or 10%
only blocks further growth; it never authorizes a build.

## GC

gc performs a non-destructive mark-and-sweep census. It takes a namespace lock,
scans twice, and emits JSON containing each absolute path, byte size, state,
lease/process facts, references, and retained reasons. Roots include authority
refs, active sessions, feat-iced, active leases, sealed
ledger/build-result/evidence consumer refs, current release, SBOM, manually
retained roots, and recovery archives. Any uncertain process identity,
reference, hash, ledger, recovery state, or VWS doctor result retains the
entry. The default command cannot scan the real managed cache without an
explicit production-scan flag.

Dry-run candidates are limited to unreferenced entries with a canonical
`rebuildable.json` proof, no ledger/result/evidence/session/process/lease/recovery
binding, a complete recursive metadata fingerprint, and an expired grace
period. The report uses `build-gc-report-v1.schema.json`; policy input remains
`build-gc-policy-v1.schema.json`. Result-only identities are reported as
retained rather than silently omitted. The optional apply path rechecks the
identity, lease, references visible to the census, marker, and fingerprint
before moving a candidate into an in-cache quarantine; it does not permanently
delete data.
This task does not scan or modify the existing Tessera cache.

## Commands

From the repository root:

    PYTHONDONTWRITEBYTECODE=1 python3 -B native/testkit/makepad-build/tests/test_makepad_build.py
    native/testkit/makepad-build/bin/build-key --input <input.json> --out <key.json>
    native/testkit/makepad-build/bin/preflight --key <key.json> --target-dir <managed-target> --lockfile <Cargo.lock> --estimated-peak-bytes <bytes>
    native/testkit/makepad-build/bin/gc --fixture-root <temporary-root>

The tests use small temporary fixtures only. They do not generate a Cargo
target and do not constitute real Makepad compilation, GUI, accessibility,
IME, mobile, performance, or release evidence. Those facts remain subject to
the Makepad plan's real-build and lab gates.
