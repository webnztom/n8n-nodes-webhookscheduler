# n8n-nodes-webhookscheduler

This is an n8n community node for the [Webhook Scheduler](https://webhookscheduler.com) API.

Webhook Scheduler is a hosted API that sends an HTTP request at a future date and time you choose. It retries failed deliveries, keeps a log of every attempt, and lets you cancel a request before it is sent. This node covers the API: **Schedule, Cancel, Cancel by Reference, Get and Get Many**.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

- [Installation](#installation)
- [Operations](#operations)
- [Credentials](#credentials)
- [Use it as an AI Agent tool](#use-it-as-an-ai-agent-tool)
- [Example: a follow-up in 3 days, cancelled if the customer replies](#example-a-follow-up-in-3-days-cancelled-if-the-customer-replies)
- [Errors](#errors)
- [Compatibility](#compatibility)
- [Resources](#resources)

## Installation

Follow the [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/). The package name is `n8n-nodes-webhookscheduler`.

## Operations

Resource: **Job** (a scheduled HTTP request).

| Operation | API call | What it does |
|---|---|---|
| **Schedule** | `POST /api/v1/schedule` | Schedules a request: URL, method, JSON body, headers and Run At. Optional **Reference** (your own ID, used to cancel later), **Idempotency Key** (8 to 80 characters; the same key returns the same job instead of a duplicate) and **Criticality**. Returns the job `id`. |
| **Cancel** | `POST /api/v1/jobs/{id}/cancel` | Cancels one job by ID. Only jobs not sent yet (`PENDING` or `RETRYING`) can be cancelled. |
| **Cancel by Reference** | `GET /api/v1/jobs?reference=…&state=open`, then cancel each | Cancels every job with that reference that has not been sent yet. Returns one item: `canceledCount`, `canceled[]`, `skipped[]` (for example a job being delivered at that very second) and `complete`. |
| **Get** | `GET /api/v1/jobs/{id}` | One job with its delivery attempts (status code, response body, duration). |
| **Get Many** | `GET /api/v1/jobs` | Jobs, newest first, filtered by Reference, State (open or terminal) or Status. Supports Return All. |

Limits to know:

- **Run At** must be in the future. The Free plan schedules up to **7 days** ahead and includes 100 deliveries a month. Paid plans schedule up to 365 days ahead.
- **Reference**: up to 120 characters, letters, digits and `: . _ / -` only. Use something like `invoice-followup:in_1Q2w3E`, not an email address.
- Body up to 100 KB, headers up to 16 KB. The URL must be public (private networks are rejected).
- Headers removed before delivery: `Authorization`, `Proxy-*`, `Cookie`, `Set-Cookie`, `Content-Type`, `Content-Length`, `User-Agent`, `Host`, `Forwarded`, `X-Forwarded-For/Host/Proto`, `X-Real-IP`, `Via`, `Webhook-Signature`, `X-Webhook-Signature` and hop-by-hop headers. To authenticate the call, send a secret in a custom header such as `X-Api-Key`, or verify the `Webhook-Signature` header on your receiver.

## Credentials

1. Create a free account at [webhookscheduler.com](https://webhookscheduler.com/signup). No card needed.
2. Open [Dashboard → API keys](https://webhookscheduler.com/dashboard/api-keys) and create a key. Keys start with `wh_live_` or `wh_test_`.
3. In n8n, create a **Webhook Scheduler API** credential and paste the key. The node only ever sends the key to `https://webhookscheduler.com`; the host cannot be changed.

The credential test calls `GET /api/v1/jobs?limit=1`, which needs a valid key and changes nothing.

## Use it as an AI Agent tool

The node is marked `usableAsTool`, so an n8n **AI Agent** can call it.

1. Add an **AI Agent** node, then click **+ Tool** and pick **Webhook Scheduler**.
2. Choose the operation, for example **Schedule**.
3. For each field the agent should decide, click the sparkle icon ("Let the model define this parameter") or write `{{ $fromAI('runAt', 'ISO 8601 date-time in the future') }}`.
4. Give the tool a plain description, for example "Schedules a follow-up for a customer. Use it when the user asks to be reminded or followed up later."

Self-hosted n8n: community nodes can only be used as tools when the instance sets `N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true`.

## Example: a follow-up in 3 days, cancelled if the customer replies

Give your AI Agent a "follow-up in 3 days" tool. The agent schedules the follow-up while it talks to the customer; a second workflow cancels it if the customer answers first.

**Workflow 1: the agent and its tools**

- **AI Agent**, with the system message: "When you promise to follow up, call *schedule_follow_up* with the customer ID. Never promise a follow-up without calling the tool."
- Tool: **Webhook Scheduler → Schedule**, renamed `schedule_follow_up`:
  - URL: the production URL of the Webhook trigger in workflow 3, for example `https://your-n8n.example.com/webhook/follow-up-due`
  - Run At: `{{ $now.plus({ days: 3 }).toISO() }}`
  - Body: `{{ JSON.stringify({ customerId: $fromAI('customerId', 'The customer ID'), topic: $fromAI('topic', 'What to follow up on, in one sentence') }) }}`
  - Additional Fields → Reference: `follow-up:{{ $fromAI('customerId', 'The customer ID') }}`
  - Additional Fields → Idempotency Key: `follow-up:{{ $fromAI('customerId', 'The customer ID') }}:{{ $now.toFormat('yyyy-MM-dd') }}` (one follow-up per customer per day, even if the agent calls the tool twice)

**Workflow 2: the customer replied**

- Trigger: your inbox or CRM ("new reply from customer").
- **Webhook Scheduler → Cancel by Reference**, Reference: `follow-up:{{ $json.customerId }}`.

**Workflow 3: the follow-up is due**

- **Webhook** trigger, path `follow-up-due`, method POST. Webhook Scheduler calls it after 3 days with the body you scheduled (`customerId`, `topic`).
- Check the customer's current state, then send the email or message.

Make the handler in workflow 3 idempotent: a delivery can be retried, and a cancel can arrive while the request is being sent.

## Errors

The node turns API errors into messages you can act on:

| Status | Meaning |
|---|---|
| 400 | Validation failed. The message names the field, for example `runAt: runAt must be in the future`, or the job can no longer be cancelled. |
| 401 | The API key is missing, invalid or revoked. |
| 403 | Plan limit: more than 7 days ahead on the Free plan, or the monthly delivery quota is used up. The message includes the upgrade link. |
| 404 | No job with that ID in this workspace. |
| 409 | The job changed state while it was being cancelled. |
| 429 | Rate limit. Turn on **Retry On Fail** for bursts. Cancel allows 30 calls a minute. |

## Compatibility

Built with `@n8n/node-cli` 0.48.5 and `n8n-workflow` 2.x, declarative style, no runtime dependencies. Requires n8n 1.0 or later.

## Resources

- [Webhook Scheduler API reference](https://webhookscheduler.com/docs/api)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)

## Version history

- **0.2.0**: Cancel by Reference operation; the API key is only ever sent to `https://webhookscheduler.com` (no Base URL field); header help lists the headers the API removes; clear errors for 400, 401, 403, 404, 409 and 429; API-key link fixed.
- **0.1.0**: Schedule, Cancel, Get and Get Many.
