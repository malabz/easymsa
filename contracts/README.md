# Shared HTTP compatibility baseline

`http-v1.json` is an exact mirror of the backend repository's canonical
`contracts/http-v1.json`. It contains reviewed responses captured through the real
FastAPI routes with a temporary database and stubbed execution. It is test data
only and is not imported by the application bundle.

`src/lib/api/httpContract.test.ts` consumes the mirror through the existing API
clients, result adapters, error parser and download URL builders. It checks that
submission defaults, nulls, full/duplicate titles, token isolation and result-stage
behavior remain compatible. The backend separately verifies its real HTTP output
against the same baseline; frontend fetch mocks alone do not establish compatibility.

Run the frontend tests with the existing `npm test`, or only this check:

```text
node node_modules/vitest/vitest.mjs run src/lib/api/httpContract.test.ts --environment jsdom
```

To verify both repositories together, use the backend's joint script with explicit
checkout/runtime paths:

```text
python /path/to/backend/scripts/check_http_contract.py --frontend /path/to/frontend --node /path/to/node
```

The script checks that both copies match, then runs both test suites. It does not
silently update either fixture. Review intentional API changes against the
backend's capture, update its canonical baseline, then copy that same file here.
See the backend `contracts/README.md` for capture and normalization details.

`benchmark-feedback-v2.json` is also mirrored from the backend. Its real-route
capture covers static repository precheck, quick queue counts, extended failure
information and the `X-EasyMSA-Benchmark-Version: 2` negotiation header. The
capture preserves the strict legacy status/error shape when that header is
absent. Only random task IDs and validated non-null timestamps are normalized.
`feedbackContract.test.ts` reads the same payloads through the frontend schemas
and private API client; no application code imports these test fixtures.
