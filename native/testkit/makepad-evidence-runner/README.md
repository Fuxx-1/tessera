# Makepad Evidence Runner

This is a dependency-free, fail-closed skeleton for Makepad runtime evidence.
It does not create screenshots, AX trees, IME traces, mobile installs, or
performance samples by itself. It reserves a managed evidence directory,
captures runner/platform metadata, hashes declared artifacts, seals an immutable
record, and validates that the sealed record is complete enough to consume.

The default evidence root is:

```text
~/Library/Application Support/Tessera/evidence
```

Local test invocation:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -B -m unittest discover \
  -s native/testkit/makepad-evidence-runner/tests -v
```

Example blocked skeleton flow:

```bash
REVISION=80a9f7a7bf182c8a1043497b52032d281eb35748
RUN_ID=RUN-20260826T000000Z-80a9f7a7-000
ROOT="$HOME/Library/Application Support/Tessera/evidence"
MANIFEST=native/testkit/makepad-evidence-runner/matrix-manifest-v1.json

python3 -B native/testkit/makepad-evidence-runner/bin/reserve-makepad-run \
  "$REVISION" "$RUN_ID" \
  --manifest "$MANIFEST" \
  --cell-id MAKEPAD-M0-SHELL-DESKTOP-LIGHT \
  --binary-sha256 e62cd414109c4525a3952278e10a95bde3e7119bd9603f7a7ccede7bdbbe5d8b \
  --build-key-sha256 0000000000000000000000000000000000000000000000000000000000000000 \
  --evidence-root "$ROOT"

python3 -B native/testkit/makepad-evidence-runner/bin/capture-makepad-metadata \
  "$ROOT/$REVISION/$RUN_ID"

python3 -B native/testkit/makepad-evidence-runner/bin/hash-makepad-artifacts \
  "$ROOT/$REVISION/$RUN_ID" --evidence-root "$ROOT"

python3 -B native/testkit/makepad-evidence-runner/bin/seal-makepad-run \
  "$ROOT/$REVISION/$RUN_ID" --manifest "$MANIFEST" --evidence-root "$ROOT"

python3 -B native/testkit/makepad-evidence-runner/bin/validate-makepad-evidence \
  "$ROOT/$REVISION/$RUN_ID/evidence.json" --manifest "$MANIFEST" --evidence-root "$ROOT"
```

The validation command is expected to return nonzero until the run directory
contains declared real runtime artifacts for the selected matrix cell.
