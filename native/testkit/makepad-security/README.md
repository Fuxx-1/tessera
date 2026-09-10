# Makepad Security Input Testkit

This directory is Rust-independent contract infrastructure for the Makepad
security and input boundary. It validates JSON fixtures for the intended
`untrusted input -> bounded parser -> Safe IR -> typed broker` path. It does not
build Makepad, launch a GUI, inspect system calls, or prove runtime safety.

The frozen policy is `policy-v1.json`. It records the M0 Makepad revision and
the known upstream risk boundary: `makepad-script`, `makepad-script-std`,
`makepad-live-reload-core`, `makepad-html`, `makepad-svg`, `makepad-network`,
`runsplash`, `Splash`, `ScriptVm`, and `eval_with_append_source` must never
become reachable from user, remote document, plugin, clipboard, drag/drop, file,
or network bytes.

Run the contract self-tests from the repository root:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -B -m unittest discover -s native/testkit/makepad-security/tests -v
```

Run all checked fixtures:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -B native/testkit/makepad-security/bin/validate-makepad-security \
  --policy native/testkit/makepad-security/policy-v1.json \
  --fixtures-dir native/testkit/makepad-security/fixtures \
  --check-expectations
```

Without `--check-expectations`, the validator exits nonzero for any blocked
payload. With `--check-expectations`, negative fixtures are expected to block
with their listed error codes.

The validator is intentionally fail-closed. Unknown schema versions, malformed
URLs, entity-encoded dangerous schemes, HTML/DOM/JS/Live/Script/raw SVG,
`foreignObject`, shader input, unsafe resource counters, path traversal,
cancelled/timed-out/stale-generation tasks, UI-thread synchronous I/O, and
external actions outside the typed broker all produce a `BLOCKED` verdict.
