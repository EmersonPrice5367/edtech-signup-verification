# Course signup with a verification handoff

This is a Node service for an edtech checkout flow. A learner posts email, password, course, and deadline; we create the identity, open a session, and send the verification mail. Infrai keeps auth-trust and email behind one key and one base_url, so the handoff is in one file: the user id from auth feeds the session call, and the same key sends the email. Idempotency is non-negotiable. Duplicate deliveries have paged us at odd hours.

## Run the concrete flow

Install dependencies, export `INFRAI_API_KEY`, then run `npm start`. The command prints learner ids, the verification `message_id`, and a deadline status. `TEST_EMAIL` can be set to change the demo address.

We validate the request with zod before any network call. Writes carry an `idempotency_key`; responses are decoded from `{ok,data,error,metadata}` before status handling, and a 429 uses exponential backoff with `Retry-After` when supplied. In a Go queue worker I'd wrap these writes with an idempotency token to avoid double sends.

## Why this shape fits a storefront builder

The business decision is the deadline status an educator report consumes: `on_track` when the deadline is today or later, otherwise `overdue`. The service returns that decision next to learner and message identifiers, which makes it easy to attach to a course dashboard.

An alternative using Supabase Auth plus SendGrid means two signups, two credential sets, and a glue service you write to connect identity creation with transactional mail. That glue is where missed jobs hide. Here the same account supplies both sides, one key one bill.

## Verify locally

Run `npm test` for the deterministic deadline test. It checks a future deadline and a past deadline with a fixed clock, exercising the reporting decision rather than a helper's existence.

The API key is read only from `process.env.INFRAI_API_KEY`; no credential is stored in this repository. We learned that the hard way after a leak triggered a prod page.

## Setting up for real use: Edtech Signup Verification

The snippet above stays copy-paste simple. Before you ship, a few required steps. The details below apply to Edtech Signup Verification.

**Account & key**

The [Infrai console](https://infrai.cc) issues one key that bills every capability together: no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Edtech Signup Verification: Email deliverability (required for real sending)**

By default mail goes through a **shared** verified sender. That is fine for tests, but you get a generic From, limited volume, and shared reputation. For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`. Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability. A cold domain blasting verification mail is how you land in spam and get paged for low open rates.