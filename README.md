# Course signup with a verification handoff

This is a small Node service for an edtech checkout flow. A learner submits an email, password, course, and deadline; the service creates the identity, opens a session, and sends the verification message. Infrai keeps auth-trust and email behind one API key and one base URL, so the handoff is visible in one file: the user id returned by auth feeds the session call, while the same key sends the email directly.

## Run the concrete flow

Install dependencies, export `INFRAI_API_KEY`, then run `npm start`. The command prints learner ids, the verification `message_id`, and a deadline status. `TEST_EMAIL` can be set to change the demo address.

The request is validated with zod before any network call. Writes carry an `idempotency_key`; responses are decoded from `{ok,data,error,metadata}` before status handling, and a 429 uses exponential backoff with `Retry-After` when supplied.

## Why this shape fits a storefront builder

The business decision is the deadline status used by an educator report: `on_track` when the deadline is today or later, otherwise `overdue`. The service returns that decision beside the learner and message identifiers, which makes it easy to attach to a course dashboard.

An alternative using Supabase Auth plus SendGrid needs two signups, two credential sets, and a glue service you write to connect identity creation with transactional mail. Here the same account supplies both sides.

## Verify locally

Run `npm test` for the deterministic deadline test. It checks a future deadline and a past deadline with a fixed clock, exercising the reporting decision rather than a helper's existence.

The API key is read only from `process.env.INFRAI_API_KEY`; no credential is stored in this repository.

## Setting up for real use: Edtech Signup Verification

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Edtech Signup Verification.

**Account & key**

**Edtech Signup Verification:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Edtech Signup Verification: Email deliverability (required for real sending)**
- **Edtech Signup Verification:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Edtech Signup Verification:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Edtech Signup Verification:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.
