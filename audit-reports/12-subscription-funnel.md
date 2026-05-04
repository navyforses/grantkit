# Phase 12 — Subscription Funnel Code Review (Task 5.2)

> Sandbox-side code review of the Paddle subscription funnel: webhook handler,
> tRPC subscription router, Pricing UI, Paddle.js client integration. Live
> Paddle test-mode flow verification (operator-side) is out of scope for this
> document — see Task 5.2 next steps.
>
> Date: 2026-05-04 · Branch: `claude/grantkit-audit-continue-7mEhS`

## Scope

| File | Lines | What it does |
|---|---|---|
| `server/paddleWebhook.ts` | 270 | HMAC-SHA256 signature verify + event dispatch |
| `server/paddleWebhook.test.ts` | 211 | Unit tests for `verifyPaddleSignature` + `processWebhookEvent` |
| `server/routers.ts` (`subscription.*`) | 240-301 | tRPC `status` / `cancel` / `activate` |
| `server/_core/bootstrap.ts` (lines 130-141) | 12 | Body parser + webhook route registration order |
| `server/_core/env.ts` (lines 8-9) | 2 | `paddleWebhookSecret` / `paddleApiKey` env mapping |
| `client/src/hooks/usePaddle.ts` | 130 | Paddle.js init + `Checkout.open` wrapper |
| `client/src/components/PricingCTA.tsx` | 80 | Auth-gated CTA → checkout → `subscription.activate` mutation |
| `client/src/pages/Home.tsx` (lines 472-549) | 78 | Pricing section UI with monthly/annual toggle |

## Findings summary

| # | Severity | Title |
|---|---|---|
| 1 | 🔴 CRITICAL | `subscription.activate` is client-trusted — premium-bypass exploit |
| 2 | 🟠 HIGH | `subscription.cancel` doesn't tell Paddle — user keeps getting billed |
| 3 | 🟠 HIGH | Webhook signature verification fails fail-open if `PADDLE_WEBHOOK_SECRET` unset |
| 4 | 🟠 HIGH | `rawBody = JSON.stringify(req.body)` will mismatch HMAC for legitimate webhooks |
| 5 | 🟡 MEDIUM | No replay protection (timestamp not validated) |
| 6 | 🟡 MEDIUM | No idempotency / `event_id` deduplication |
| 7 | 🟡 MEDIUM | Annual/monthly toggle is decorative — checkout always uses monthly price ID |
| 8 | 🟡 MEDIUM | Webhook always returns 200 — DB transient failures = silent state drift |
| 9 | 🟢 LOW | Hardcoded plan ID in `subscription.activate` ignores actual plan bought |
| 10 | 🟢 LOW | `mapPaddleStatus` returns `"none"` on unknown status — silently cancels user |
| 11 | 🟢 LOW | `PADDLE_CLIENT_TOKEN` hardcoded — can't swap sandbox/live without code change |

---

## 🔴 1. `subscription.activate` is client-trusted — premium-bypass exploit

**Location:** `server/routers.ts:272-300`

```ts
activate: protectedProcedure
  .input(z.object({
    paddleCustomerId: z.string().optional(),
    paddleSubscriptionId: z.string().optional(),
    transactionId: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    await updateUserSubscription(ctx.user.id, {
      paddleCustomerId: input.paddleCustomerId || undefined,
      paddleSubscriptionId: input.paddleSubscriptionId || undefined,
      subscriptionStatus: "active",
      subscriptionPlanId: "pri_01kmygcd8stckbs3d7vt3xenq6",
    });
    // ... emails fire-and-forget ...
    return { success: true };
  }),
```

**The exploit:** every input field is `.optional()` and **no value is verified
against Paddle's API**. Any authenticated user can bypass payment by running
this in their browser console:

```js
await fetch("/api/trpc/subscription.activate?batch=1", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ "0": { json: {} } }),
});
// → user.subscriptionStatus = "active", isActive = true on next request
```

`PricingCTA.tsx:60-64` is the only legitimate caller, but tRPC has no concept
of "this endpoint is callable only from this component". Auth alone is not
sufficient.

**Fix options (pick one):**

- **(A) — Recommended:** delete this endpoint entirely. Rely on Paddle's
  webhook (`subscription.activated` event) as the only state-mutation path.
  Frontend just shows "activating…" until the webhook lands and `auth.me`
  returns `subscriptionStatus: "active"`.
- **(B):** keep the endpoint but verify with Paddle's API server-side before
  writing — `GET https://api.paddle.com/transactions/{transactionId}` with
  `PADDLE_API_KEY`, confirm `customer_id` matches `ctx.user.paddleCustomerId`
  (or the email matches `ctx.user.email`) and status is `completed`.

Option A is simpler and matches Paddle's recommended architecture. The
webhook is the source of truth.

---

## 🟠 2. `subscription.cancel` doesn't tell Paddle — user keeps getting billed

**Location:** `server/routers.ts:253-270`

```ts
cancel: protectedProcedure.mutation(async ({ ctx }) => {
  if (ctx.user.subscriptionStatus !== "active") {
    return { success: false, error: "No active subscription" };
  }
  await updateUserSubscription(ctx.user.id, {
    subscriptionStatus: "cancelled",
  });
  // ... email ...
  return { success: true };
}),
```

This marks **our DB** as cancelled but never calls Paddle's
`POST /subscriptions/{id}/cancel` endpoint. Result:

- User sees "cancelled" in their profile
- Paddle continues to charge their card on next renewal
- When Paddle eventually sends `subscription.renewed` webhook, we (potentially)
  re-activate them — or just record a stale `paddleSubscriptionId` against a
  cancelled DB row

**Fix:**

```ts
import { Paddle } from "@paddle/paddle-node-sdk";
const paddle = new Paddle(ENV.paddleApiKey);

cancel: protectedProcedure.mutation(async ({ ctx }) => {
  if (!ctx.user.paddleSubscriptionId) return { success: false };
  await paddle.subscriptions.cancel(ctx.user.paddleSubscriptionId, {
    effective_from: "next_billing_period", // grace period until period end
  });
  // Don't mark cancelled in our DB — wait for the webhook to do it.
  // Paddle will fire subscription.canceled when the period ends.
  return { success: true };
}),
```

Or, alternatively, redirect the user to Paddle's customer portal URL and
let them cancel there. Either way — **stop writing `cancelled` to our DB
without informing Paddle**.

---

## 🟠 3. Webhook signature verification fails fail-open if secret unset

**Location:** `server/paddleWebhook.ts:235`

```ts
if (ENV.paddleWebhookSecret) {
  if (!signature) { /* 401 */ }
  if (!isValid) { /* 401 */ }
}
// else: skip verification entirely
```

Per `PROJECT_MAP.md` Railway env-var list (Infrastructure section), the
production deploy currently has **no `PADDLE_WEBHOOK_SECRET` set** — the env
var list shows only `DATABASE_URL`, `ANTHROPIC_API_KEY`, `NODE_ENV`, `PORT`,
`RAILWAY_PUBLIC_DOMAIN`, `VITE_GOOGLE_MAPS_*`. (Operator should verify in
Railway dashboard.)

If true, then anyone can POST a forged event to
`https://grantkit-production-06f7.up.railway.app/api/paddle/webhook` and
mutate any user's `subscriptionStatus` (provided they guess a valid
`customer_id`).

**Fix:** fail-closed in production:

```ts
// server/_core/env.ts (or at startup in bootstrap.ts)
if (process.env.NODE_ENV === "production" && !process.env.PADDLE_WEBHOOK_SECRET) {
  throw new Error("PADDLE_WEBHOOK_SECRET must be set in production");
}
```

Or, in `paddleWebhook.ts:235`:

```ts
if (!ENV.paddleWebhookSecret) {
  if (process.env.NODE_ENV === "production") {
    res.status(500).json({ error: "Webhook secret not configured" });
    return;
  }
  // Dev only: log warning and continue
  console.warn("[Paddle Webhook] No secret set — skipping verification (DEV ONLY)");
}
```

---

## 🟠 4. `rawBody = JSON.stringify(req.body)` will mismatch HMAC

**Location:** `server/paddleWebhook.ts:213-222` + middleware order in
`server/_core/bootstrap.ts:138-141`

```ts
// bootstrap.ts:138
app.use(express.json({ limit: "50mb" }));
// bootstrap.ts:141
registerPaddleWebhookRoute(app);
```

```ts
// paddleWebhook.ts:213-222
(req: Request, res: Response) => {
  let rawBody = "";
  if (req.body && typeof req.body === "object") {
    rawBody = JSON.stringify(req.body);
  }
  handleWebhook(req, res, rawBody);
}
```

By the time this handler runs, `express.json()` has already parsed the body
into an object. `JSON.stringify(req.body)` will produce **a** valid JSON
string but rarely the byte-identical one Paddle signed:

- Property order is not guaranteed (V8 mostly preserves, but not contractual)
- Paddle's payload may include `\u` escapes for non-ASCII; `JSON.stringify`
  does not re-escape ASCII-printable chars
- Whitespace is stripped on parse
- Numeric formatting (`1.0` ↔ `1`, exponential ↔ decimal) can differ

Net result: HMAC verification will **fail for legitimate Paddle webhooks**
once a secret is configured (Finding 3). This is why Finding 3 currently
appears latent — production has no secret, so verification is skipped, so
this bug is masked.

**Fix:** capture the raw body BEFORE JSON parsing, scoped to the webhook
route only:

```ts
// In bootstrap.ts, BEFORE express.json():
import express from "express";
app.post(
  "/api/paddle/webhook",
  express.raw({ type: "application/json", limit: "1mb" }),
  (req, res) => {
    const rawBody = (req.body as Buffer).toString("utf8");
    const event = JSON.parse(rawBody);
    handleWebhook(req, res, rawBody, event);
  }
);
// THEN apply express.json() globally for everything else.
app.use(express.json({ limit: "50mb" }));
```

This is the standard Paddle/Stripe pattern — register the raw-body webhook
route first, then the global JSON parser. The unit tests in
`paddleWebhook.test.ts` only exercise `verifyPaddleSignature` with raw
strings directly, so they never catch this regression.

---

## 🟡 5. No replay protection (timestamp not validated)

**Location:** `server/paddleWebhook.ts:48-88`

`verifyPaddleSignature` extracts `ts` from the signature header but never
validates that it's recent. An attacker who captures one valid webhook (e.g.,
via logs, MITM on a misconfigured proxy, or a leaked replay file) can replay
it indefinitely.

**Fix:** reject if `Math.abs(Date.now()/1000 - parseInt(ts)) > 300` (5 min
tolerance, matches Paddle's documented window).

```ts
const tsAge = Math.abs(Date.now() / 1000 - parseInt(ts, 10));
if (tsAge > 300) return false;
```

---

## 🟡 6. No idempotency / `event_id` deduplication

**Location:** `server/paddleWebhook.ts:111-204`

`processWebhookEvent` doesn't check whether `event.event_id` was already
processed. Paddle's docs explicitly state webhooks may be retried (e.g., on
network issues, on non-2xx response). On retry:

- `subscription.activated` email sent twice
- Admin "new subscriber" notification sent twice
- DB writes are technically idempotent (same status), but emails are not

**Fix:** add a `processed_webhook_events` table:

```sql
CREATE TABLE processed_webhook_events (
  event_id VARCHAR(255) PRIMARY KEY,
  event_type VARCHAR(64) NOT NULL,
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_processed_at (processed_at)
);
```

In `processWebhookEvent`:

```ts
try {
  await db.insert(processedWebhookEvents).values({ event_id: event.event_id, event_type });
} catch (err) {
  if (err.code === "ER_DUP_ENTRY") {
    return { handled: false, message: `Already processed: ${event.event_id}` };
  }
  throw err;
}
```

Garbage-collect old rows monthly (`WHERE processed_at < NOW() - INTERVAL 90 DAY`).

---

## 🟡 7. Annual/monthly toggle is decorative — checkout always uses monthly price ID

**Location:** `client/src/pages/Home.tsx:472-549` + `client/src/hooks/usePaddle.ts:13`

The Pricing section toggles `pricingPlan` state between `"monthly"` and
`"annual"` and updates the displayed price (`Home.tsx:519, 522`). But the
underlying `<PricingCTA>` (line 541) doesn't accept a `priceId` prop and
`usePaddle.ts` hardcodes:

```ts
export const PADDLE_PRICE_ID = "pri_01kmygcd8stckbs3d7vt3xenq6";
```

So whether the user clicks "Annual" or "Monthly", they always end up at
checkout for the monthly $9 plan. UX expectation broken; users may report
fraud / chargeback when their card shows monthly billing after they "selected
annual".

**Fix:**

```tsx
// usePaddle.ts
export const PADDLE_PRICE_IDS = {
  monthly: "pri_01kmygcd8stckbs3d7vt3xenq6",
  annual: "pri_<annual-id-here>", // operator: create in Paddle dashboard
};

export function openPaddleCheckout(plan: "monthly" | "annual", locale, email, onSuccess) {
  // use PADDLE_PRICE_IDS[plan]
}
```

```tsx
// PricingCTA.tsx — accept plan prop, default "monthly"
interface PricingCTAProps { plan?: "monthly" | "annual"; ... }

// Home.tsx line 541
<PricingCTA plan={pricingPlan} text={t.pricing.cta} ... />
```

Operator-side: create the annual price in Paddle dashboard ($86.40/year =
$7.20/month, matching the "Save 20%" badge).

---

## 🟡 8. Webhook always returns 200 — DB transient failures = silent state drift

**Location:** `server/paddleWebhook.ts:265-269`

```ts
} catch (error) {
  console.error("[Paddle Webhook] Error processing webhook:", error);
  res.status(200).json({ success: false, error: "Internal processing error" });
}
```

Comment says "Still return 200 to prevent Paddle from retrying" — but this
is the wrong default. For transient errors (DB connection drop, Railway
restart mid-request), a 5xx tells Paddle to retry the webhook later, which
is exactly what we want. Returning 200 means the webhook is permanently lost
and the user's subscription state silently drifts.

**Fix:** distinguish business errors from infrastructure errors:

```ts
} catch (error) {
  console.error("[Paddle Webhook] Error processing webhook:", error);
  // 5xx → Paddle will retry (default 3 attempts over ~24 hr)
  res.status(503).json({ success: false, error: "Internal processing error" });
}
```

---

## 🟢 9. Hardcoded plan ID in `subscription.activate` ignores actual plan bought

**Location:** `server/routers.ts:284`

```ts
subscriptionPlanId: "pri_01kmygcd8stckbs3d7vt3xenq6",
```

If/when annual plan is wired up (Finding 7), this hardcode will mis-record
all annual subscribers as monthly. Currently moot because there's only one
plan. Bundle into the Finding 1 fix (delete the endpoint, let webhook record
plan from `data.items[0].price.id`).

---

## 🟢 10. `mapPaddleStatus` returns `"none"` on unknown status

**Location:** `server/paddleWebhook.ts:93-109`

```ts
default:
  return "none";
```

If Paddle adds a new status type (`"trialing_ended"`, etc.) we silently set
the user to `"none"` — effectively cancelling their access. Should log a
warning and either keep current status or default to `"active"` if the
event was for an active subscription.

---

## 🟢 11. `PADDLE_CLIENT_TOKEN` hardcoded — can't swap sandbox/live without code change

**Location:** `client/src/hooks/usePaddle.ts:10`

```ts
const PADDLE_CLIENT_TOKEN = "live_3ef8b32c3653a66953160274200";
```

Paddle client tokens are designed to be public (visible in bundle) — that's
fine. But hardcoding means we can't run sandbox tests against a separate
Paddle account without rebuilding. Move to `import.meta.env.VITE_PADDLE_CLIENT_TOKEN`
with the live value as fallback.

---

## Recommended remediation order

| Order | Finding | Effort | Impact |
|---|---|---|---|
| 1 | #1 (delete `activate`) | ~30 min sandbox | Closes premium-bypass — **must ship before any meaningful user acquisition** |
| 2 | #4 (raw-body middleware) + #3 (fail-closed in prod) | ~45 min sandbox | Required before #2 fix can be trusted (webhook becomes the auth path) |
| 3 | #2 (cancel via Paddle API) | ~1 hr sandbox + needs `PADDLE_API_KEY` on Railway | Stops users being billed after cancel |
| 4 | #6 (idempotency) + #5 (replay) + #8 (5xx on transient errors) | ~1.5 hr sandbox + 1 migration | Webhook hardening — bundle as one PR |
| 5 | #7 (annual price wiring) | ~30 min sandbox + operator creates annual price in Paddle | Restores trust in pricing UI |
| 6 | #9, #10, #11 | ~30 min combined | Cleanup |

**Total sandbox effort:** ~4-5 hours engineering + 1 DB migration + 1
operator action (create annual price + add `PADDLE_API_KEY` to Railway).

## Out of scope for this report (operator-side)

- Live Paddle test-mode flow: register account → click pricing → checkout →
  webhook fires → DB updates → confirmation email arrives. Run from sandbox
  Paddle dashboard.
- Verifying Railway env var presence: `PADDLE_WEBHOOK_SECRET`, `PADDLE_API_KEY`.
- Reviewing actual Paddle dashboard config: webhook destination URL, signing
  secret rotation policy, IP allowlist (if any).

## Next steps

1. Triage Finding #1 — recommend deleting `subscription.activate` endpoint in
   a CRITICAL hotfix PR, replacing client `activateMutation.mutate` call with
   `auth.me.invalidate()` polling until webhook lands.
2. Bundle Findings #3-#6 + #8 into a "webhook hardening" PR with the
   `processed_webhook_events` migration + raw-body middleware refactor.
3. Annual pricing wiring (#7) — coordinate with operator to create the
   annual price ID in Paddle dashboard first.
