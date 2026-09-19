# 07 — მონეტიზაციის არქიტექტურა: როგორ უნდა დაპროგრამდეს GrantKit, რომ ფული გამოიმუშაოს

> **ავტორი:** Arash (Staff SWE) · **თარიღი:** 2026-09-19 · **HEAD:** `main` (PR #247-ის შემდეგ)
> **სფერო:** დიზაინი, არა იმპლემენტაცია. რეპოში არაფერი შეცვლილა. Production/DB მიუწვდომელი — ყველა „live" რიცხვი `audit-reports/04-db-content.md`-დანაა (2026-05).
> **წინაპირობა:** მენეჯერი ირჩევს ზედაპირების ნაზავს (Helper Pro · B2B2C · partner offers · concierge · platform grants). ეს დოკუმენტი ისეა აგებული, რომ **თითოეული ზედაპირი დამოუკიდებლად ჩაირთოს** — ერთი entitlement მოდელი, ერთი metering, ერთი attribution, და ზედაპირები ამ სამზე დაშენებული module-ებია.
> **მარკერები:** `[✓]` = კოდში გადამოწმებული ხაზით · `[შეფასება]` = ჩემი დასკვნა · `[⚠ owner]` = მფლობელის გადაწყვეტილებას მოითხოვს.

---

## 1. პრინციპები

| # | პრინციპი | რას ნიშნავს პრაქტიკაში | სად ირღვევა დღეს `[✓]` |
|---|---|---|---|
| P1 | **Entitlement მხოლოდ სერვერზეა** | client-ს არასდროს ეკითხება „შეიძლება?" — client მხოლოდ *რენდერს* ცვლის. ყოველი ფასიანი მოქმედება tRPC middleware-ს გადის. | `Catalog.tsx:53,174-175` — `PREVIEW_ITEMS = 3` client-ზე; `organizations.list` `publicProcedure` `pageSize ≤ 100` (`routers.ts:1330-1347`), `mapPoints` ≤ 5,000 (`:1382-1401`). Paywall DevTools-ით 1 request-ია. |
| P2 | **ერთი `plans → entitlements` მოდელი** | გეგმა = სახელი; entitlement = feature flag/ლიმიტი. კოდი კითხულობს entitlement-ს, არასდროს გეგმის სახელს. Paddle price ID ↔ plan mapping ერთ ადგილას. | `subscription.status.isActive = status==="active" \|\| role==="admin"` (`routers.ts:248`) — ერთი ბულეანი, გეგმის ცნება არ არსებობს; price ID hardcoded `usePaddle.ts:13`. |
| P3 | **ყველაფერი იზომება** | ყოველი LLM call, API call, map load, Places request → counter subject-ის მიხედვით (user/org/key/ip). ქვოტა = entitlement. | `smartSearch` public + Haiku ყოველ query-ზე cache-ის გარეშე (`routers.ts:546,1462`; `queryExpander.ts:50-57`); ერთადერთი ლიმიტი 100 req/min/IP (`bootstrap.ts:136`). |
| P4 | **ყველაფერი ატრიბუტირდება** | signup, plan_started, offer_click, lead, org_contact — სერვერული `events` + Umami. UTM first-touch. | Analytics გათიშულია (`index.html:31`); `admin.stats` = `GROUP BY subscriptionStatus` (`db.ts:527-552`). Funnel 0. |
| P5 | **Golden rule** | სქემის ცვლილება = ცალკე PR, migration Railway-ზე merge-მდე (`CLAUDE.md`). ამ დოკუმენტის ყოველი ცხრილი migration-ნომერზეა მიბმული (§10). | 0020 დაუდასტურებელია; journal 0013-ზე (`03-tech-diagnostic` F8). **0021-მდე Phase 0.9 უნდა დასრულდეს.** |
| P6 | **Simplicity First — რას არ ვაშენებთ ახლა** | (a) `plans` ცხრილი DB-ში — არა, კონსტანტა კოდში; (b) Redis — არა, MySQL counter; (c) Stripe მიგრაცია — არა; (d) partner self-service portal — არა; (e) subdomain white-label — არა, iframe; (f) full SSR — არა, head-injection + bot prerender; (g) `users.subscription*` სვეტების drop — არა, dual-read; (h) lead form-ები partner-ისთვის — არა, redirect-only. | — |

**ვარაუდი (Karpathy §1):** მფლობელი D1=(a) და D2=(a) ირჩევს (უფასო B2C, billing pause). თუ D1=(b) — §2-ის ყველაფერი იგივეა, უბრალოდ `free` გეგმის entitlement სია მცირდება. თუ D2=(b) — §3 Phase 0-ში გადადის.

---

## 2. Entitlements და გეგმები

### 2.1 გეგმები (კონსტანტა `shared/plans.ts`, არა ცხრილი)

| Plan | ვისთვის | ინტერვალი | seats | Paddle price env |
|---|---|---|---|---|
| `free` | ემიგრანტი | — | 1 | — |
| `helper_pro` | სოცმუშაკი / მოხალისე / ოჯახი | monthly · annual | 1 | `PADDLE_PRICE_HELPER_PRO_MONTHLY` / `_ANNUAL` |
| `org_basic` | დიასპორული ორგ., მცირე NGO | annual | 5 | `PADDLE_PRICE_ORG_BASIC_ANNUAL` ან `source=manual` |
| `org_pro` | NGO / CCAS / ქსელი | annual | 25 | `source=manual` (ინვოისი, §3.4) |
| `concierge` | სამედიცინო ნავიგაციის კლიენტი | one-time (+ optional monthly) | 1 | `PADDLE_PRICE_CONCIERGE_INTAKE` |

### 2.2 Entitlements — ერთი map

```ts
// shared/plans.ts  (excerpt)
export const PLANS = ["free","helper_pro","org_basic","org_pro","concierge"] as const;
export type Plan = typeof PLANS[number];
export type Entitlements = {
  export: boolean;        // CSV / print pack
  alerts: number;         // profile-based digests (0 = off)
  ai_quota_day: number;   // grantChat messages / day
  seats: number;
  case_list: boolean;     // several beneficiaries' plans (Helper Pro)
  api_access: boolean;    // /api/v1 + api_keys
  white_label: boolean;   // /embed/:orgSlug theming
  concierge: boolean;     // cases.* for own case
};
export const ENTITLEMENTS: Record<Plan, Entitlements> = {
  free:       { export:false, alerts:1,  ai_quota_day:20,  seats:1,  case_list:false, api_access:false, white_label:false, concierge:false },
  helper_pro: { export:true,  alerts:5,  ai_quota_day:200, seats:1,  case_list:true,  api_access:false, white_label:false, concierge:false },
  org_basic:  { export:true,  alerts:5,  ai_quota_day:200, seats:5,  case_list:true,  api_access:false, white_label:true,  concierge:false },
  org_pro:    { export:true,  alerts:10, ai_quota_day:500, seats:25, case_list:true,  api_access:true,  white_label:true,  concierge:false },
  concierge:  { export:true,  alerts:1,  ai_quota_day:50,  seats:1,  case_list:false, api_access:false, white_label:false, concierge:true  },
};
```

**წესი:** `free`-ს აქვს *ყველაფერი*, რაც ემიგრანტისთვის Phase 0–3-ში იქმნება (დირექტორია, გიდები, ჩეკლისტი, alerts ×1, AI 20/დღე). MASTER-PLAN 3.7-ის ტესტი — „ემიგრანტისთვის არაფერი იკეტება" — ამ map-ის unit test-ია: `expect(ENTITLEMENTS.free.alerts).toBeGreaterThan(0)` და ა.შ.

### 2.3 სქემა — `subscriptions` + `memberships` (Drizzle, migration 0023, §10)

```ts
// drizzle/schema.ts — additions (≤ 60 lines)
export const orgAccounts = mysqlTable("org_accounts", {          // B2B tenant ≠ `organizations` (directory)
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  settings: json("settings"),   // { theme, defaultLang, defaultCountry, allowedEmbedOrigins[] }
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const memberships = mysqlTable("memberships", {
  id: int("id").autoincrement().primaryKey(),
  orgAccountId: int("orgAccountId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "admin", "member"]).default("member").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("memberships_org_user_uq").on(t.orgAccountId, t.userId),
  index("memberships_user_idx").on(t.userId),
]);

export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  subjectType: mysqlEnum("subjectType", ["user", "org"]).notNull(),
  subjectId: int("subjectId").notNull(),                          // users.id | org_accounts.id
  plan: mysqlEnum("plan", ["free", "helper_pro", "org_basic", "org_pro", "concierge"]).notNull(),
  status: mysqlEnum("status", ["trialing", "active", "past_due", "paused", "cancelled"]).notNull(),
  source: mysqlEnum("source", ["paddle", "manual", "grant", "trial"]).notNull(),
  provider: varchar("provider", { length: 16 }),                  // "paddle" | null
  providerSubscriptionId: varchar("providerSubscriptionId", { length: 128 }),
  providerCustomerId: varchar("providerCustomerId", { length: 128 }),
  priceId: varchar("priceId", { length: 128 }),                   // Paddle price → interval derives from map
  seats: int("seats").default(1).notNull(),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  trialEndsAt: timestamp("trialEndsAt"),
  lastEventAt: timestamp("lastEventAt"),                          // Paddle occurred_at — out-of-order guard (§11)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => [
  index("subs_subject_idx").on(t.subjectType, t.subjectId, t.status),
  uniqueIndex("subs_provider_sub_uq").on(t.providerSubscriptionId),
]);
```

**`users.subscription*` სვეტები (`schema.ts:25-30`) რჩება** — dual-read: `resolvePlan()` ჯერ `subscriptions`-ს კითხულობს, თუ არაფერია → legacy სვეტებს (`subscriptionStatus==="active"` → `helper_pro`). Drop = ცალკე migration მოგვიანებით, `[⚠ owner]` (სვეტის წაშლა escalation-ია).

### 2.4 Plan-ის ამოხსნა და middleware

```ts
// server/entitlements.ts  (≤ 30 lines)
import { TRPCError } from "@trpc/server";
import { ENTITLEMENTS, type Entitlements, type Plan } from "@shared/plans";
import { t } from "./_core/trpc";               // export `t` next to router/publicProcedure

const RANK: Plan[] = ["free", "concierge", "helper_pro", "org_basic", "org_pro"];
const ACTIVE = new Set(["trialing", "active", "past_due"]);   // past_due = grace, Paddle retries

export async function resolvePlan(userId: number, role: string): Promise<{ plan: Plan; orgAccountId: number | null }> {
  if (role === "admin") return { plan: "org_pro", orgAccountId: null };
  const own = await db.getActiveSubscription("user", userId);              // subscriptions row or legacy users.* fallback
  const orgs = await db.getActiveOrgSubscriptionsForUser(userId);           // JOIN memberships → subscriptions
  const best = [own, ...orgs].filter((s) => s && ACTIVE.has(s.status))
    .sort((a, b) => RANK.indexOf(b!.plan) - RANK.indexOf(a!.plan))[0];
  return best ? { plan: best.plan, orgAccountId: best.subjectType === "org" ? best.subjectId : null }
              : { plan: "free", orgAccountId: null };
}

export const requireEntitlement = (key: keyof Entitlements) =>
  t.middleware(async ({ ctx, next }) => {
    if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
    const { plan, orgAccountId } = await resolvePlan(ctx.user.id, ctx.user.role);
    const ent = ENTITLEMENTS[plan];
    const ok = typeof ent[key] === "number" ? (ent[key] as number) > 0 : ent[key] === true;
    if (!ok) throw new TRPCError({ code: "FORBIDDEN", message: `ENTITLEMENT_REQUIRED:${key}`, cause: { requiredFor: key, plan } });
    return next({ ctx: { ...ctx, plan, entitlements: ent, orgAccountId } });
  });
// usage:  exportCases: protectedProcedure.use(requireEntitlement("export")).query(...)
```

- `ctx.user` ყოველ request-ზე DB-დან იტვირთება (`sdk.ts:86` `getUserByOpenId`) — plan-ის staleness ამ დონეზე არ არსებობს; `resolvePlan` 1–2 დამატებითი SELECT-ია. Cache (LRU 60 წმ, webhook-ზე invalidate) მხოლოდ თუ p95 გაიზარდა.
- Client-ს `auth.me` აბრუნებს `{ plan, entitlements }` — UI upgrade-ღილაკს აჩვენებს, მაგრამ **გადაწყვეტილებას არ იღებს**. `subscription.status.isActive` (`routers.ts:242-250`) → deprecate, ჩაანაცვლოს `plan`.
- **Trial:** Paddle `trialing` → `active` mapping უკვე არსებობს (`paddleWebhook.ts:147-148`); manual trial = `source="trial"`, `trialEndsAt`, cron `status→cancelled` ვადის გასვლისას (daily GH Action, არა boot-time job).
- **Annual/monthly:** ერთი plan, ორი `priceId`; interval `PRICE_MAP[priceId].interval`-იდან. F6 (`Home.tsx:56,498-527` toggle დეკორატიულია) ამით იხსნება — `openPaddleCheckout(plan, interval)`.
- **Grandfathering:** live DB-ში users = 0 (`04-db-content`), $9 გამომწერი არ არსებობს — grandfathering-ის ლოგიკა არ ვაშენოთ. ერთადერთი hook: legacy `pri_01kmyg…` (`usePaddle.ts:13`) → `PRICE_MAP`-ში `helper_pro/monthly`-ად რჩება, რომ ძველი checkout-ის webhook არ დაიკარგოს.

---

## 3. Billing

### 3.1 Paddle-ის აღდგენის გზა (D2=(b) ან Phase 3.7)

| ნაბიჯი | რა | მტკიცებულება `[✓]` | ვინ |
|---|---|---|---|
| B1 | `PADDLE_WEBHOOK_SECRET` + `PADDLE_API_KEY` Railway-ზე | webhook fail-closed 503 secret-ის გარეშე (`paddleWebhook.ts:317-321`); `ENV.paddleApiKey` არსებობს, არსად გამოიყენება (`env.ts:8-9`); `OPS.md` „Variables set" სიაში არცერთი PADDLE_* არ არის | OP |
| B2 | Migration 0020 apply + verify | `processWebhookEvent` ყოველ event-ზე `tryRecordProcessedEvent` (`paddleWebhook.ts:190-197`; `db.ts:1940`) — ცხრილის გარეშე ყველა webhook 503 | OP: `node scripts/apply-migration-0020.mjs`; `check-migration-0020.mjs` |
| B3 | `subscription.cancel` → Paddle API | დღეს მხოლოდ DB `cancelled` + email (`routers.ts:253-271`); ბარათი იჭრება | CC-Mira: `POST https://api.paddle.com/subscriptions/{id}/cancel` `{effective_from:"next_billing_period"}`; **DB-ს არ წერს** — webhook `subscription.canceled` ჩამოვა. SDK არ გვჭირდება — ერთი `fetch`. |
| B4 | Price ID-ები env-ში | `PADDLE_PRICE_ID` და client token hardcoded (`usePaddle.ts:10,13`); `items:[{priceId}]` (`:99`) | Client: `import.meta.env.VITE_PADDLE_CLIENT_TOKEN`, `VITE_PADDLE_PRICE_*`; Server: `server/billing/prices.ts` `PRICE_MAP` env-იდან. Dockerfile ARG-ები (`Dockerfile:22-30` pattern) |
| B5 | Webhook → `subscriptions` upsert | დღეს `updateUserSubscription(users)` (`paddleWebhook.ts:237-243`); `planId = items[0].price.id` უკვე იკითხება (`:231-233`) | CC-Mira: `upsertSubscriptionFromPaddle({providerSubscriptionId: data.id, plan: PRICE_MAP[priceId].plan, status, occurredAt})`; legacy `users.*` write რჩება dual-write-ად 1 ფაზა |
| B6 | უცნობი სტატუსი | `mapPaddleStatus` default → `"none"` (`paddleWebhook.ts:155-156`) — ახალი Paddle სტატუსი მომხმარებელს ჩუმად აუქმებს | `default: log + return previous` |
| B7 | `transaction.completed` (one-time) | `subscriptionEvents` სია მხოლოდ `subscription.*` (`paddleWebhook.ts:168-176`) | concierge intake-ისთვის (§6) |
| B8 | Sandbox e2e | — | OP: sandbox checkout → `SELECT plan,status FROM subscriptions` ≤ 30 წმ; cancel → Paddle dashboard `canceled` |

### 3.2 VAT / MoR

Paddle = Merchant of Record: VAT/OSS, ინვოისი, refund, chargeback Paddle-ის მხარესაა — solo founder-ისთვის ეს **მთავარი არგუმენტია Paddle-ის დარჩენისთვის**. FR აუდიტორიისთვის ფასი ინვოისში VAT-ით უნდა ჩანდეს (loi Toubon/DGCCRF — Paddle checkout locale `fr` უკვე გადაეცემა, `usePaddle.ts:98-104`).

### 3.3 Stripe ალტერნატივა `[შეფასება]`

არა. Stripe ≠ MoR: VAT რეგისტრაცია/OSS deklaracia ჩვენზეა, Stripe Tax დამატებით. გადასვლის ერთადერთი მიზეზი: Paddle-ის B2B შეზღუდვები (§11 R1). თუ დადგა — `subscriptions.provider` სვეტი უკვე provider-agnostic-ია; მხოლოდ webhook adapter იწერება.

### 3.4 B2B ინვოისირება — რეკომენდაცია

| ვარიანტი | როდის | როგორ |
|---|---|---|
| **Manual invoice (რეკომენდაცია pilot-ებისთვის)** | Phase 4 3 pilot (€2–10k/წ, MASTER-PLAN §2.3) | ადმინი `admin.subscriptions.grant({subjectType:"org", plan, seats, currentPeriodEnd, source:"manual"})`; ინვოისი Paddle-ის გარეთ (მფლობელის იურიდიული პირი; `act-generator` skill). Paddle-ის fee არ იხდება. |
| Paddle Business / manual collection | თუ pilot-ი ბარათით იხდის | Paddle Billing `collection_mode: manual` (ინვოისი due-date-ით) — **დაშბორდში გადასამოწმებელია, ხელმისაწვდომია თუ არა ანგარიშზე** `[შეფასება]` |
| Self-serve `org_basic` annual | Phase 4+, თუ ≥ 5 org | ჩვეულებრივი Paddle price, `customData: { orgAccountId }` |

### 3.5 ტესტები (არსებული 22 `paddleWebhook.test.ts` + 11 `subscription.test.ts` = 33-ის გაფართოება)

1. `PRICE_MAP`: ყოველი env price → `{plan, interval}`; უცნობი → throw at boot.
2. `mapPaddleStatus("something_new")` → previous status, log (B6).
3. Webhook `subscription.activated` `custom_data.orgAccountId` → `subscriptions(subjectType="org")` + `seats`.
4. Duplicate `event_id` → 1 upsert, 0 email (უკვე არსებობს pattern).
5. Out-of-order: `canceled(occurred_at=T2)` შემდეგ `activated(T1<T2)` → სტატუსი რჩება `cancelled` (`lastEventAt` guard).
6. `subscription.cancel`: Paddle API mock გამოძახებული ×1; `subscriptions` row **უცვლელი**.
7. `requireEntitlement` მატრიცა: 5 plan × 8 key = 40 assertion ერთ `it.each`-ში; admin → ყველა true.
8. `resolvePlan`: user free + org_pro membership → `org_pro`; membership cancelled → `free`.
9. `transaction.completed` → `cases.status: intake→active` (§6).
10. „ემიგრანტისთვის არაფერი იკეტება": `ENTITLEMENTS.free` snapshot test.

---

## 4. B2B tenancy

### 4.1 მოდელი

- **`org_accounts`** (§2.3) — tenant. სახელი განზრახ **არ არის** `organizations` (1,110 NGO-ს დირექტორია, `schema.ts:200`). Tenant-ი შეიძლება *იყოს* დირექტორიის ორგანიზაცია (`settings.linkedOrgId`) — claim-your-listing (cap 18) ამ ბმულზე დაშენდება.
- **`memberships`** — roles `owner|admin|member`. Seats = `COUNT(memberships) ≤ ENTITLEMENTS[plan].seats`, ინვაიტი ემაილით (Resend, არსებული შაბლონები `emailService.ts`).
- **Org-scoped data:** `cases` (§6) `orgAccountId` nullable; Helper Pro-ს case list = `orgAccountId IS NULL AND userId = me`; org-ის = `orgAccountId = ctx.orgAccountId`. ერთი `orgProcedure = protectedProcedure.use(requireMembership())` — ყოველი `org.*` procedure ამას გადის; `orgAccountId` **არასდროს** input-იდან, ყოველთვის ctx-იდან.
- **რა რჩება public:** `organizations.list/detail/mapPoints` (`routers.ts:1330-1402`) — B2B ვყიდით *არა მონაცემს* (ის უფასოა), არამედ **ფენას**: ka/ru, embed, seats, case list, API SLA.

### 4.2 White-label: iframe embed (რეკომენდაცია) vs subdomain

| | iframe `/embed/:orgSlug` | subdomain `{slug}.grantkit.app` |
|---|---|---|
| Effort | **S–M**: ერთი route, `EmbedLayout` (navbar-ის გარეშე), `?lang=ka&country=FR&city=Lyon&domain=health`, theme `org_accounts.settings.theme` → CSS variables | **M–L**: wildcard DNS + TLS Railway-ზე (`[შეფასება]` — Railway custom domain per-hostname-ია, wildcard დაუდასტურებელი), host-based tenant resolve |
| CSP | `frameAncestors: ["'self'"]` (`bootstrap.ts:122`) **ბლოკავს ყველა embed-ს** → `/embed/*`-ზე per-route helmet override: `frame-ancestors` = `settings.allowedEmbedOrigins` (allowlist, არა `*`) | არ სჭირდება |
| Auth | ანონიმური — cookie არ იგზავნება (და არც უნდა; `sameSite:"none"` `cookies.ts:45` აქ „დაგვეხმარებოდა", მაგრამ ეს CSRF surface-ია — F17 lax-ზე გადადის) | ჩვეულებრივი |
| Loader | `<script src="https://…/embed.js" data-org="slug" data-lang="ka">` → iframe + `postMessage` height; `embed.js` სტატიკური, `client/public/` | — |
| SEO | embed noindex (`SEO.tsx` `noIndex`) — org-ის საიტს ჩვენი კონტენტი არ „ეპარება" | duplicate content რისკი |

**გადაწყვეტილება:** iframe Phase 4 pilot-ებისთვის; subdomain მხოლოდ თუ pilot-ი მოითხოვს.

### 4.3 Public API `/api/v1`

- **Express, არა tRPC** — გარე დეველოპერს superjson batch არ სჭირდება. `server/apiV1.ts`: `GET /api/v1/organizations?country=FR&city=Lyon&domain=health&lang=ka&page=1` → `listOrganizations()` (`db.ts:1509`) + `entity_translations` lang-ით (Phase 2.5). `GET /api/v1/organizations/:orgId`, `GET /api/v1/guides?country=FR&lang=ka`.
- **`api_keys`** (migration 0023): `id, orgAccountId, prefix (gk_live_ab12), keyHash (sha256), scopes CSV, rateLimitPerMin, lastUsedAt, revokedAt`. Raw key ერთხელ ჩანს შექმნისას. Header `Authorization: Bearer gk_live_…`.
- **Rate limit:** `express-rate-limit` (`package.json:111`) `keyGenerator = api key id`, ლიმიტი `api_keys.rateLimitPerMin`; anon `/api/v1` → 401 (public მონაცემი tRPC-ით ისედაც ღიაა — API = SLA + ფორმატი + key, არა exclusivity).
- **Metering:** ყოველი call → `usage_counters(subjectType="apikey", metric="api_call")` (§7). თვიური ლიმიტი entitlement-ად (`api_calls_month`) — org_pro 100k `[შეფასება]`.
- **Entitlement:** `api_access` — key-ის შექმნა `orgProcedure.use(requireEntitlement("api_access"))`.

---

## 5. Partner offers / lead-gen

> `[⚠ owner]` MASTER-PLAN §2.3 „ალტერნატივა 2" (sponsorship/affiliate) **უარყოფილია** ინტერესთა კონფლიქტის გამო მოწყვლად აუდიტორიაზე. ეს სექცია ისეა დაპროექტებული, რომ ჩართვა = *მხოლოდ* ethics allowlist-ის შევსება; ცარიელი allowlist = ზედაპირი გამორთულია. გადაწყვეტილება ახალ D19-ად უნდა ჩაიწეროს PIVOT.md §4-ში.

### 5.1 სქემა (migration 0024)

- **`partners`**: `id, name, legalName, country, contactEmail, payoutModel enum(cpc|cpl|cpa|flat), postbackSecret (HMAC), status enum(draft|active|paused), createdAt`.
- **`offers`**: `id, partnerId, domain enum(11 დომენი), countries CSV, cities CSV nullable, languages CSV, excludedStatuses CSV (asylum_seeker,undocumented,…), placements CSV (guide_step|org_sidebar|checklist_item|ai_footer), title JSON×5, body JSON×5, disclosure JSON×5 (სავალდებულო, ცარიელი = validation error), trackingUrl, startsAt, endsAt, priority, isActive`.
- **`offer_events`**: `id, offerId, eventType enum(impression|click|lead|conversion), placement, contextRef (guide slug / orgId / checklist item), sessionHash (sha256(ip+ua+dailySalt)[:16]), lang, country, utm JSON, clickId (opaque, click-ზე იქმნება), partnerRef, createdAt`. **`userId` სვეტი არ არსებობს** — განზრახ.

### 5.2 Placement engine — `server/offers/placement.ts` (pure function, ტესტირებადი)

```
selectOffers({ placement, country, city, lang, domain, statusClient?, flags })
  1. flags.emergency || flags.asylumContext || flags.undocumentedContext  → []      // hard exclusion
  2. ALLOWLIST[placement] არ შეიცავს domain-ს                              → []      // ethics switch
  3. offers WHERE isActive && countries∋country && (cities IS NULL || ∋city)
       && languages∋lang && placements∋placement && now ∈ [startsAt,endsAt]
       && (statusClient == null || excludedStatuses ∌ statusClient)
  4. ORDER BY priority → max 1 per placement
```

- **Flags-ის წყარო:** guide frontmatter `commercial: false` (default `false` — გიდი ცხადად უნდა აღნიშნოს `true`); org page: `acceptsUndocumented === "yes"` ან `mainCategory ∈ {legal_status, safety_rights, mental_health}` (`schema.ts:226-233,274`) → excluded; checklist item-ს `commercial` ველი; AI footer — allowlist default `[]`.
- **`statusClient`** მხოლოდ client-იდან მოდის request param-ად და **არ ილოგება** (D6: სტატუსი სერვერზე არასდროს ინახება) — `offer_events`-ში სტატუსის სვეტი არ არის.
- **Ethics allowlist** — `content/offers-allowlist.json`, review PR-ით (როგორც გიდები):
  ```json
  { "guide_step": ["daily_life","money_benefits","language_education","work_income","housing"],
    "org_sidebar": ["housing","language_education"],
    "checklist_item": ["daily_life","money_benefits"],
    "ai_footer": [] }
  ```
  `legal_status`, `safety_rights`, `mental_health`, `health`, `family_children`, `community_social` — **არცერთ placement-ში** default-ად. „SIM ბარათი" და „ბანკის ანგარიში" = `daily_life`/`money_benefits`; „ადვოკატი" = `legal_status` → **არასდროს** (FR loi 1971 referral რეგულირებულია, MASTER-PLAN §2.3).

### 5.3 Attribution და consent

- **Redirect-only:** ღილაკი → `GET /api/offers/:id/go?p=guide_step&ctx=puma&lang=ka` → INSERT `click` (clickId) → 302 `trackingUrl?gk_ref={clickId}&utm_source=grantkit&utm_medium={placement}`. Partner-ს **არაფერი** მიდის გარდა opaque clickId-სა.
- **Postback:** `POST /api/partners/postback` body `{clickId, event:"lead"|"conversion", value?}`, header `X-Partner-Signature` = HMAC-SHA256(`partners.postbackSecret`) — `paddleWebhook.ts:52-88`-ის `verifyPaddleSignature`/freshness pattern-ის reuse.
- **Impression** ილოგება მხოლოდ სერვერული render-ისას (placement query-ის შედეგზე), client-ის გარეშე — ბოტების ხმაური ნაკლებია.
- **GDPR/RGPD:** cookie 0, sessionHash დღიური salt-ით (Umami-ს მოდელი), legitimate interest; disclosure ტექსტი **ყოველ** კარტზე („პარტნიორის შეთავაზება · ჩვენ ვიღებთ საკომისიოს" ×5 ენა — loi influenceurs/DGCCRF `[france-market-compliance]`). **Lead form ჩვენს მხარეს — v1-ში არ ვაშენებთ** (P6h); თუ დაჭირდა — ცალკე `leads` ცხრილი `consentAt`+`consentText` სვეტებით, მხოლოდ მომხმარებლის მიერ აკრეფილი ველები.

### 5.4 Admin და reporting

- `client/src/pages/AdminOffers.tsx` (ცალკე, ≤ 400 ხაზი — 2.6-ის პრეცედენტი: `Admin.tsx` არ იზრდება) + `admin.offers.{list,upsert,pause}`, `admin.partners.*`.
- Partner reporting: `admin.offers.report({partnerId, month})` → CSV აგრეგატები (impression/click/lead/conversion per offer per country/lang) — **sessionHash/clickId-ის გარეშე**. Partner portal — არა (P6d); თვეში ერთი ემაილი Resend-ით.

---

## 6. Concierge / premium services

> `[⚠ owner]` PIVOT.md §1 „არ აკეთებს: … case management-ს". ფასიანი სამედიცინო ნავიგაცია სწორედ ესაა. ეს არის ყველაზე მაღალი ერთეულ-შემოსავლის ზედაპირი (J3 journey: ქართველი პაციენტი აშშ/FR) და ყველაზე მაღალი იურიდიული ექსპოზიცია (Art. 9 ჯანმრთელობის მონაცემი). დიზაინი იზოლირებული module-ია — `cases.*` router + 4 ცხრილი — გამორთვა = router-ის არ-რეგისტრაცია.

### 6.1 სქემა (migration 0025, მხოლოდ owner yes-ზე)

- **`cases`**: `id, userId, orgAccountId nullable, type enum(medical_navigation), status enum(intake|active|waiting_client|closed), country, city, lang, intake JSON (encrypted-at-rest column — AES via app key, `[შეფასება]` MySQL column encryption Railway-ზე არ არის), assignedUserId, providerTransactionId, paidAmountCents, currency, consentAt, consentVersion, createdAt, closedAt, purgeAfter`.
- **`case_steps`**: `caseId, position, title JSON×5, status enum(todo|doing|done|blocked), dueAt, doneAt, note` — შაბლონი `content/case-templates/medical_navigation.json` (intake → საბუთების ჩეკლისტი → კლინიკის შერჩევა → საცხოვრებელი → გადაზიდვა), ორგანიზაციები `organizations`-დან `orgId`-ით.
- **`case_files`**: `caseId, storageKey, filename, mime, sizeBytes, sha256, uploadedByUserId, createdAt`. Storage: **S3-compatible private bucket EU-ში** (Cloudflare R2 EU jurisdiction ან S3 `eu-west-3`). `@aws-sdk/client-s3` + `s3-request-presigner` **უკვე dependency-ა და არსად გამოიყენება** (`package.json:64-65`) — presigned PUT/GET, 15 წთ TTL, bucket public access 0. ფაილი `express.json 50mb`-ს (`bootstrap.ts:143`) **არ გადის** — პირდაპირ bucket-ში.
- **`case_messages`**: `caseId, authorUserId nullable (null = system), body, sentVia enum(app|email), createdAt`. **Email-first:** გამავალი Resend-ით (არსებული 5-ენოვანი infra), შემომავალი — არა (Resend inbound არ აქვს) → კლიენტი პასუხობს app-ში ან ემაილში `Reply-To: hello@<domain>` და ოპერატორი ხელით აკოპირებს. Phase-later: inbound webhook (Postmark/SES).

### 6.2 გადახდა და handoff

- **One-off intake** (რეკომენდაცია): Paddle one-time price → `transaction.completed` webhook (`customData: {caseId}`) → `cases.status: intake→active` (§3 B7). **Subscription** („აქტიური საქმის თვიური") — მოგვიანებით, თუ საშუალო საქმე > 60 დღეა.
- **Handoff ადამიანთან:** `assignedUserId` = membership internal `org_accounts` „GrantKit Concierge"-ში (`role: admin`) — `users.role` enum-ს (`schema.ts:13`) **არ ვცვლით** (enum ALTER = migration + risk). `cases.*` procedures: კლიენტი ხედავს თავისს (`userId = me`), staff — assigned-ს, admin — ყველას.
- **Entitlement:** `concierge` flag არა plan-ზე, არამედ `cases` row-ს არსებობაზე (`requireCaseAccess(caseId)`); §2.2-ის `concierge` plan რჩება subscription-ვარიანტისთვის.
- **Retention:** `purgeAfter = closedAt + 90d` → daily job: `case_files` bucket delete + `intake` NULL. `auth.deleteAccount` (3.6) → cases cascade. DPIA ერთგვერდიანი (D15) **სავალდებულოა ამ module-მდე**.

---

## 7. Metering და ხარჯის კონტროლი

### 7.1 `usage_counters` — Redis-ის გარეშე

```sql
CREATE TABLE usage_counters (
  subjectType ENUM('user','org','apikey','ip') NOT NULL,
  subjectId   VARCHAR(64) NOT NULL,      -- id ან ip-hash
  metric      VARCHAR(32) NOT NULL,      -- ai_chat | smart_search | api_call | places_enrich | embed_load
  day         DATE NOT NULL,
  count       INT NOT NULL DEFAULT 0,
  PRIMARY KEY (subjectType, subjectId, metric, day)
);
-- increment (atomic, 1 statement):
INSERT INTO usage_counters VALUES (?,?,?,CURDATE(),1) ON DUPLICATE KEY UPDATE count = count + 1;
```

`server/metering.ts`: `consume(subject, metric, quota)` → `SELECT count` → `≥ quota` ? throw `TOO_MANY_REQUESTS` : increment. Race (ორი პარალელური request ზღვარზე) = +1 ზედმეტი call — მისაღებია. GC: `DELETE WHERE day < CURDATE() - 90`. `ai.grantChat`-ში: `consume({user}, "ai_chat", ctx.entitlements.ai_quota_day)` — MASTER-PLAN 2.7-ის „21-ე შეტყობინება → 429". Org pool: `subjectType="org"` თუ `ctx.orgAccountId`.

### 7.2 LLM ხარჯი

| წყარო `[✓]` | დღეს | გარდაქმნა | ფაზა |
|---|---|---|---|
| `smartSearch` ×2 public, Haiku ყოველ query-ზე (`routers.ts:546,1462`; `queryExpander.ts:50-57`) | 100/min/IP → 6,000 LLM call/სთ ერთი IP-დან | `expandQuery` შიგნით LRU (`lru-cache` `package.json:116`): key = NFC(lowercase(collapse-ws(q))), max 5,000, ttl 24 სთ — ორივე namespace ერთ cache-ს იზიარებს; route limit `/api/trpc/catalog.smartSearch` + `organizations.smartSearch` 10/min/IP (`bootstrap.ts:131-136` pattern) | 0.5 |
| `grantChat`: history ≤ 20 × 5,000 char (`routers.ts:1305-1313`), `max_tokens 4096`, ≤ 8 iteration (`grantAssistant.ts:127-128,147-149`) | ერთი შეტყობინება ≤ ~30k input token | history → ბოლო 10; `max_tokens 1024`; `MAX_ITERATIONS 5`; system prompt + tools `cache_control: ephemeral` (prompt caching — ფასები `claude-api` skill-იდან იმპლემენტაციისას, არა მეხსიერებიდან); anon → 401 რჩება (`:1301` protected) | 2.7 |
| ქვოტა | 0 | `usage_counters` `ai_chat` 20/200/500 (§2.2) | 2.7 (in-memory Map fallback, თუ ცხრილი 0021-ში ვერ მოხვდა — §10) |

### 7.3 Maps / Places

- **Browser key (map loads):** Catalog-ზე რუკა eager-ია; 2.8 („map below fold lazy", marker clustering) + mobile **list-first** (რუკა ღილაკით). Org detail: dynamic map → **Static Maps** ერთი `<img>` (ერთი request, cache-ადი) `[შეფასება]` — SKU იაფია dynamic-ზე.
- **`mapPoints`** default 2,000 / max 5,000 (`routers.ts:1396`): bbox+zoom-ზე server clustering (2.8) + LRU 10 წთ key=(country, bbox rounded 0.1°, filters) — Places-ს არ ეხება, DB-ს ზოგავს.
- **Places enrichment budget:** `contact-enrichment.yml` `limit` default 50/დღე; დამატებით script-ში `--max-requests` hard cap + `usage_counters(subjectType="org", subjectId="system", metric="places_enrich")` — მეორე workflow-ის run იმავე დღეს cap-ს ვერ გადააჭარბებს. GCP budget alert $50/თვე (OP).
- **Key rotation** P0-ს ეხება (PIVOT §5) — metering key-ს არ იცავს, მხოლოდ ხარჯს ზღუდავს.

### 7.4 Spend alerting + dashboard

- **Anthropic:** Admin API usage/cost report endpoint-ები Admin key-ს მოითხოვს (OP ქმნის) → weekly GH Action `cost-report.yml` → Resend ემაილი, თუ 7-დღიანი ხარჯი > `COST_ALERT_USD`. Fallback (Admin key-ის გარეშე): `usage_counters` × ფასთა ცხრილი = **სავარაუდო** ხარჯი.
- **Railway:** metrics dashboard-ში; usage alert Railway-ის Settings → Usage (OP).
- **`admin.stats` გაფართოება** (`routers.ts:697-699` → `db.ts:527`): `costs: { aiCallsToday, aiCallsMonth, aiEstimatedUsd, smartSearchCacheHitRate, apiCallsMonth, placesCallsMonth, embedLoadsMonth }` — ყველა `usage_counters`-დან ერთი `GROUP BY metric` query-ით.

---

## 8. Attribution და შემოსავლის ანალიტიკა

### 8.1 ორი ფენა

| ფენა | რა | სად |
|---|---|---|
| **Umami (client, cookieless)** | pageview + UI events: `org_call_click`, `org_directions_click`, `org_site_click` (1.9), `guide_step_done`, `checklist_shared`, `search_no_results`, `embed_load`, `offer_impression_view` | `index.html:31` env hook უკვე არსებობს; D18 Umami cloud |
| **`events` (server, migration 0022)** | `id, name, subjectType, subjectId nullable, sessionHash, orgAccountId nullable, props JSON, lang, country, createdAt`; allowlist სახელები: `signup, plan_started, plan_cancelled, plan_changed, offer_click, offer_lead, offer_conversion, org_contact, case_opened, case_closed, api_key_created, embed_load` | emit სერვერული კოდიდან იქ, სადაც ფაქტი ხდება: `auth.register` → `signup`; webhook → `plan_*`; `/go` → `offer_click`; postback → `offer_lead/conversion`. `org_contact` — client → `telemetry.track` public mutation (allowlist + 60/min/IP), რადგან გრანტ-ანგარიშს **სერვერული** რიცხვი სჭირდება, Umami-ს export-ზე დამოკიდებულების გარეშე. |

**UTM first-touch:** `localStorage.gk_utm` პირველ ვიზიტზე (client) → `auth.register` input-ში → `events(signup).props.utm`. `users`-ს სვეტი არ ემატება.

### 8.2 Funnel-ები (Umami + `events`)

1. **Help funnel** (north-star, MASTER-PLAN §7): visit → org page → contact action (verified org, own lang).
2. **Helper Pro:** visit → signup → `plan_started(helper_pro)` → D30 active.
3. **B2B:** `embed_load` → click-through → org pilot renewal.
4. **Offers:** `offer_impression` → `offer_click` → `offer_conversion` (postback).
5. **Concierge:** `/concierge` visit → intake form → `transaction.completed` → `case_closed`.

### 8.3 MRR / ARR / churn / ARPU — `admin.stats.revenue` (SQL sketch)

```sql
-- price constants join-დება კოდში (shared/plans.ts PRICES[plan][interval]), არა DB-ში
SELECT plan, priceId, COUNT(*) AS n
FROM subscriptions WHERE status IN ('active','trialing','past_due') AND source IN ('paddle','manual')
GROUP BY plan, priceId;                      -- MRR = Σ n × (monthly ? price : price/12); ARR = MRR × 12

SELECT COUNT(*) FROM subscriptions
WHERE status='cancelled' AND updatedAt >= DATE_FORMAT(NOW(),'%Y-%m-01');   -- churned this month
-- churn % = churned / active_at_month_start (snapshot: events.plan_started/plan_cancelled cumulative)
-- ARPU = MRR / active_count;  net revenue = Paddle payout report (MoR fee-ის შემდეგ) — Paddle-იდან, არა ჩვენი DB-დან
```

`source='grant'` და `'trial'` MRR-ში **არ** ითვლება; ცალკე ხაზი „grant-funded seats".

### 8.4 გრანტ-ანგარიშგების მეტრიკები (AMIF / Google.org / DIAIR)

`admin.reports.impact({month})` → CSV: (1) *people informed* = unique sessionHash org/guide გვერდებზე, ენის და ქვეყნის მიხედვით (`events` + Umami); (2) *contacts made* = `org_contact` count, verified org-ზე (`lastVerifiedAt ≤ 90d`, 2.1); (3) guides read (ka/ru/fr); (4) checklist shares; (5) verified orgs count (`STATUS.json`); (6) helper seats active (`memberships` × active org subs); (7) feedback ✗ rate (3.3). ყველა **აგრეგატია** — პირადი მონაცემი ანგარიშში არ ხვდება.

---

## 9. ორგანული მოზიდვა (SEO) — ყველაზე იაფი CAC

### 9.1 რა არსებობს `[✓]` და რა აკლია

- `SEO.tsx` helmet client-side; canonical `window.location.origin`-იდან (`SEO.tsx:48-50`), JSON-LD იგივე (`JsonLd.tsx:15`) — crawler-ს JS-ის გარეშე `index.html`-ის სტატიკური `<title>` და „640+ … $9/month" description ხვდება (`index.html:15-16`).
- Sitemap: `/organizations` სტატიკურ სიაშია, route არ არსებობს (`seoRoutes.ts:14`; `App.tsx:50-71`); `/grant/*` ისევ sitemap-შია (`:96-103`); „hreflang" კომენტარი (`:4`) — იმპლემენტაცია 0; `/:lang` route 0.
- Lighthouse mobile 31–39 (F14 streamdown 909 kB, F20 i18n main chunk-ში, map eager).

### 9.2 დიზაინი

| ელემენტი | როგორ | Effort |
|---|---|---|
| **Head injection ყველასთვის** | `server/seoHead.ts`: `/organizations/:orgId`, `/guides/:slug`, landing-ებზე Express კითხულობს DB-ს (`getOrganizationDetail`) და `index.html`-ის `<head>`-ში ცვლის `<title>`, description, canonical (server host-იდან, არა window), `og:*`, `hreflang ×5 + x-default`, JSON-LD. SPA ჰიდრატდება ჩვეულებრივ; helmet იგივეს გადაწერს. Cloaking არ არის — ერთი HTML ყველასთვის. | **S** |
| **Bot prerender body** | იმავე middleware-ში UA `Googlebot\|Bingbot\|…` → `<div id="root">` შიგნით სერვერული HTML (სახელი, მისამართი, ტელეფონი, სერვისები, გიდის Markdown → HTML `remark`-ით). ტექსტი = რასაც SPA აჩვენებს (dynamic rendering). Full Vite SSR — **არა** (P6f). | **M** |
| **Programmatic pages** `/{lang}/{country}/{city}/{domain}` | Phase 1.4-ის domain mapping + `organizations.city/country` (`schema.ts:204-206`) → 5 ენა × ~15 ქალაქი (Paris 222, Reims 25, Lyon 20) × 11 დომენი = ~800 გვერდი FR-ისთვის; გვერდი = H1 + ორგ. სია + 2–3 გიდი + FAQ. `/:lang` prefix wouter-ში (22 route refactor) — ეს L-ნაწილია; **შუალედური:** `?lang=` + hreflang **Phase 1**, `/:lang` Phase 4 (როგორც გეგმაშია). Thin-content გარდი: < 3 org → noindex. | **M** (+ L `/:lang`) |
| **Guides `/guides/*`** | Markdown (2.3) → HowTo + FAQPage JSON-LD frontmatter-იდან (`steps[]`, `faq[]`), `dateModified = lastVerifiedAt`. | S (2.3-ის ნაწილი) |
| **Sitemap** | `sitemap.xml` = index → `sitemap-{lang}.xml` (org, guide, programmatic), `/grant/` ამოღება 1.8-ის 301-ის შემდეგ; `/organizations` route-ის დამატება (1.8). | S |
| **JSON-LD org გვერდზე** | `@type: NGO` (ან `GovernmentOrganization` `organizationType`-ით, `schema.ts:268`), `address`, `telephone` მხოლოდ provenance-ით, `openingHours` (cap 17 შემდეგ), `availableLanguage` = `languages` CSV, `BreadcrumbList`. | S (1.8) |
| **CWV** | F14 (`react-markdown`), F20 (lazy i18n), map lazy, `catalogData` retire — უკვე 1.7/2.8-შია. | — |

**მოსალოდნელი:** ka/ru long-tail (`"AME საბუთები"`, `"бесплатная клиника Лион без страховки"`) კონკურენცია ≈ 0 — MASTER-PLAN §2.2 „არავის აქვს ka". Programmatic + guides = ერთადერთი acquisition არხი, რომელიც FB ჯგუფებზე არაა დამოკიდებული. ჯამური effort: **S + S + M** Phase 1–2-ში, **M+L** Phase 4-ში.

---

## 10. Roadmap-ზე მიბმა

| Item | ფაზა | Migration | Effort | Dependencies | Done when | კონფლიქტი გეგმასთან |
|---|---|---|---|---|---|---|
| A. `shared/plans.ts` + `ENTITLEMENTS` + snapshot test | 0 (0.2-ის შემდეგ) | — | S | D1 | `pnpm test` → free snapshot; `grep isActive client/src` → 0 გამოყენება gating-ში | არა (0.2a-ს ავსებს) |
| B. smartSearch LRU + 10/min; grantChat token cap | 0.5 / 2.7 | — | S | — | იგივე query ×2 → 1 Anthropic call; მე-11/წთ → 429 | არა |
| C. SEO head injection + hreflang + sitemap index + org JSON-LD | **1.8 (გაფართოება)** | — | S | 1.8 routes | `curl -A Googlebot /organizations/ORG-0061` → `<title>` org-ის სახელით + 5 hreflang JS-ის გარეშე | **კი:** cap 6 hreflang Phase 4-შია; ვთავაზობ S-ნაწილის 1.8-ში გადმოტანას, `/:lang` რჩება Phase 4-ში |
| D. `usage_counters` ცხრილი | 2.1 | **0021 (+1 ცხრილი)** | S | 0.9 gate | `SELECT count FROM usage_counters LIMIT 1`; 2.7-ის 429 ტესტი DB counter-ით | **კი:** 2.1 = „ერთადერთი სქემის ცვლილება", scope განსაზღვრულია. Fallback: in-memory Map 2.7-ში, ცხრილი 0022-ში |
| E. `events` ცხრილი + `telemetry.track` + `signup/plan_*` emit | 3.1 / 3.5 | **0022 (გაფართოება)** | S | 1.9 Umami | `events` ≥ 1 `org_contact` 24 სთ-ში; `admin.stats` §7 KPI live | არა (3.5 outcome telemetry-ს ემთხვევა) |
| F. Paddle repair B1–B8 + `subscriptions`/`org_accounts`/`memberships`/`api_keys` + `requireEntitlement` + Helper Pro features | **3.7** (D1 gate) | **0023** | M | 0020 verified, D1=yes, PADDLE_* env | sandbox checkout → `subscriptions` row ≤ 30 წმ; cancel → Paddle `canceled`, DB უცვლელი; entitlement მატრიცა 40/40 | არა — 3.7 სწორედ ესაა; `org_accounts` 3.7-ში *ცხრილად* მიდის, *feature* Phase 4-ში (ერთი migration ორის ნაცვლად) |
| G. Bot prerender + programmatic pages + `/:lang` | 4(f) | — | M + L | 1.4 mapping, 2.3 guides, 2.5 translations | ~800 FR გვერდი sitemap-ში 200-ით; Search Console impressions ka/ru ≥ 1k/თვე | არა |
| H. Embed `/embed/:orgSlug` + CSP override + `embed.js` + Public API v1 | 4(c) | — (0023-ის ცხრილები) | M | F | pilot-ის საიტზე iframe ka-ზე იტვირთება; `curl -H "Authorization: Bearer gk_…" /api/v1/organizations?country=FR` → 200, key-ის გარეშე 401; `usage_counters(apikey)` იზრდება | არა (Phase 3 Scope OUT „B2B multi-tenant" დაცულია) |
| I. Partners/offers/offer_events + placement engine + allowlist + AdminOffers | 4+ **[⚠ owner D19]** | **0024** | M | E, ethics allowlist | allowlist ცარიელი → 0 offer ყველა გვერდზე (ტესტი); asylum/undocumented კონტექსტი → 0 offer allowlist-ის მიუხედავად (ტესტი); postback HMAC ტესტი | **კი:** §2.3 ალტერნატივა 2 უარყოფილია — მოითხოვს ცხად D19 |
| J. Concierge `cases/*` + R2/S3 + one-time Paddle | 4+ **[⚠ owner D20]** | **0025** | L | F, DPIA (D15), bucket EU | intake → pay → `active` ≤ 30 წმ; presigned upload → `case_files` row; `deleteAccount` → 0 case rows; purge job ტესტი | **კი:** PIVOT §1.2 „არა case management" — მოითხოვს D20 + საზღვრის გადაწერას („ინფორმაციული ნავიგაცია, არა სამედიცინო/იურიდიული რჩევა") |
| K. `users.subscription*` drop | 5+ | 0026 | S | F live ≥ 1 ფაზა | `SELECT paddleCustomerId FROM users` → Unknown column; 33+ ტესტი მწვანე | `[⚠ owner]` სვეტის წაშლა |

**კრიტიკული გზა:** 0.9 (migration მექანიზმი) → A → D(0021) → E(0022) → F(0023) → H/I/J. C და B პარალელურად. **Phase 0-ში სქემა არ იცვლება** — A და B სქემის გარეშეა.

---

## 11. რისკები

| # | რისკი | ალბათობა/ზიანი | მიტიგაცია |
|---|---|---|---|
| R1 | **Paddle MoR B2B-ზე:** custom terms, PO, net-30, ინვოისი კომპანიის VAT ID-ით — Paddle-ის self-serve checkout-ს ეს არ აქვს ან შეზღუდულია; pilot NGO/CCAS ხშირად ბარათით ვერ იხდის | საშ./საშ. | `subscriptions.source='manual'` day 1-დან; Paddle მხოლოდ self-serve-ისთვის; `provider` სვეტი adapter-ისთვის (§3.3) |
| R2 | **iframe:** clickjacking / CSP; `frameAncestors 'self'` (`bootstrap.ts:122`) მოხსნა `*`-ზე = ყველა საიტს ჩვენი embed | დაბ./მაღ. | per-route helmet `/embed/*` allowlist `org_accounts.settings.allowedEmbedOrigins`; `Referer`/`Sec-Fetch-Site` check; embed anonymous — cookie არ იგზავნება; `sameSite: lax` (F17) |
| R3 | **API abuse:** key გაჟონვა, scraping, LLM endpoint-ების key-ით გამოძახება | საშ./დაბ. (მონაცემი ისედაც public) | key hash + prefix, revoke, per-key rate + day quota; `/api/v1` scope = read-only org/guide; AI **არ** არის v1 scope-ში |
| R4 | **PII partner-ს:** postback-ში ემაილი/სახელი „მოხერხებულობისთვის" | დაბ./**მაღ.** (RGPD, ნდობა) | `offer_events`-ს `userId` არ აქვს; redirect-only; postback მხოლოდ `clickId`; code review gate `server/offers/*` → Mira |
| R5 | **Double-billing:** user-ს helper_pro + org membership; ორი Paddle sub ერთ user-ზე; webhook out-of-order (`activated` `canceled`-ის შემდეგ) | საშ./საშ. | `resolvePlan` max-ს იღებს, არ აჯამებს; checkout-მდე server check „უკვე გაქვს ≥ plan" → 409; `lastEventAt` guard (§3.5 #5); `subs_provider_sub_uq` |
| R6 | **Entitlement staleness:** cache დამატების შემდეგ webhook-ის ცვლილება 60 წმ არ ჩანს; client `subscription.status` react-query stale — `PricingCTA.tsx:57-63` 2-წამიანი `setTimeout` hack | დაბ./დაბ. | დღეს user per-request DB-დან (`sdk.ts:86`) — cache არ ვამატებთ, სანამ არ დაჭირდა; webhook → `events.plan_started` → client poll `auth.me` სანამ `plan` შეიცვლება (timeout 30 წმ + „გადაამოწმეთ მოგვიანებით") |
| R7 | **Art. 9 (ჯანმრთელობა) concierge-ში** + `users.needs` plaintext უკვე დღეს (cap 14) | საშ./**მაღ.** | DPIA module-მდე; intake encrypted; EU bucket; purge 90d; consent version; DPO-ს კონსულტაცია `[⚠ owner]` |
| R8 | **Hardcoded price/token bundle-ში** (`usePaddle.ts:10,13`) → sandbox/live შერევა, F6-ის განმეორება | საშ./საშ. | env-driven `PRICE_MAP` boot-time validation: env-ში ჩამოთვლილი ყოველი price ID-ს plan უნდა ჰქონდეს, სხვაგვარად process exit |
| R9 | **`sdk.ts:91-94`** ყოველ authenticated request-ზე `upsertUser(lastSignedIn)` write — entitlement resolve-ის 2 SELECT-ს ემატება 1 UPDATE | დაბ./დაბ. | ცალკე finding, არა ამ დიზაინის ნაწილი (Karpathy §3 — ვახსენებ, არ ვცვლი); throttle 1×/საათი მოგვიანებით |
| R10 | **Consumer law FR:** 14-დღიანი withdrawal ციფრულ სერვისზე, ფასი VAT-ით, „annual" რომელიც არ იყიდება (F6) | საშ./საშ. | `/refund` გვერდი გეგმების მიხედვით; checkout-ში მხოლოდ ის interval, რომელსაც `PRICE_MAP` შეიცავს; `france-market-compliance` review copy-ზე |

---

### დანართი — რაც ვერ გადავამოწმე

Railway-ის რეალური env სია (PADDLE_*); 0020 prod სტატუსი; Paddle ანგარიშის B2B/manual-collection შესაძლებლობები; Railway wildcard domain; Anthropic Admin API-ს ხელმისაწვდომობა ამ ანგარიშზე; ყველა ფასი (LLM, Maps SKU) — იმპლემენტაციისას `claude-api` skill-იდან და GCP pricing-იდან, არა ამ დოკუმენტიდან.
