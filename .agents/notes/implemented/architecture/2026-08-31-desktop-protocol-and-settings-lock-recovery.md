# Agent Note: Desktop protocol launch and orphaned settings locks

Status: implemented

## Decision

The Desktop registers `starlight-harness://` and accepts only the `open` action. The native shell handles macOS `open-url` and Windows first/second-instance arguments, then focuses the existing single instance. A small allowlist converts trusted web sources into renderer-safe events; unknown sources do not carry through as executable input.

Settings file locks record the owning PID. Contenders retain locks owned by live processes and recover locks whose process is gone. Incomplete lock records are recoverable only after a short age grace period. Interrupted atomic-write temp siblings are cleaned after lock acquisition, while the original settings document is never deleted.

Settings scope writes reject failed Host mutations after attempting the existing recovery read. UI callers can therefore preserve the draft value and display an actionable save error.

## Consequences

Web applications can use `starlight-harness://open?source=business-xmzn` to request a launch, but browser focus/visibility remains an approximate installation check. Forced process termination no longer requires manual lock-file cleanup for the next settings write. A live lock or an unconfirmable lock still fails after the configured wait rather than risking concurrent writes.
