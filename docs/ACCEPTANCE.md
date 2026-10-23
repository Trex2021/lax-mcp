# Acceptance evidence

| Item | Observable behavior | Verification |
| --- | --- | --- |
| A1 | SDK server factory, exactly five tools, descriptions and input schemas | Real SDK client over in-memory transport |
| A2 | Correct GET/POST route, query encoding and submission body | Recording injected fetch; real local registry for transports |
| A3 | HTTP, network, JSON, size and timeout errors; next call succeeds | Fault injection and recovery checks |
| A4 | Invalid IDs, links, addresses and pagination rejected before I/O | Invalid input corpus with zero-request assertions |
| A5 | No private arguments in diagnostics; stdout contains protocol only | Captured subprocess stdout/stderr and metadata audit checks |
| A6 | stdio and Streamable HTTP, package bin | Actual SDK clients and CLI subprocess; tarball check. npm rejected publication pending owner publishing authentication with 2FA |
| A7 | Client config, all tools with examples, setup and limits | README content checks and manual review |

The submission API is not the signed competition entry flow. No test against a
local fixture constitutes registration, a live submission or a paid milestone.
Test totals and dates are recorded by the verification run rather than guessed
in this document. No claim about hidden organizer tests is made.

Recorded outcomes: [verification](VERIFICATION.md). Bid draft:
[approach](../submission/APPROACH.md). Publication is an outstanding part of A6.
