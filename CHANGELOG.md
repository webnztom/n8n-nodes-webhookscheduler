# Changelog

## 0.2.0

- Security: removed the Base URL field from the credential. The API key is only ever sent to `https://webhookscheduler.com` (credential test, request defaults and Cancel by Reference).
- Header help now lists the headers the API removes before delivery (Authorization, Cookie, Content-Type, User-Agent, X-Forwarded-*, signature headers, ...) and recommends X-Api-Key or verifying Webhook-Signature.
- Package and node description reworded as a client for the hosted Webhook Scheduler API.
- Added `npm test` (node:test against the build) and a CI test step.
- New operation: Cancel by Reference (cancels every job with a reference that has not been sent yet).
- Clear error messages for 400 (with the failing field), 401, 403 plan limits, 404, 409 and 429.
- API-key help now points to Dashboard → API keys.
- `@n8n/node-cli` pinned to 0.48.5; build info no longer shipped in the package.
- Publishing runs `npm publish --provenance` from GitHub Actions on a version tag.

## 0.1.0

- First version: Schedule, Cancel, Get and Get Many operations on jobs.
- API key credential with a connection test.
