# 03 — ტექნიკური დიაგნოსტიკა: GrantKit → immigrant-integration platform

> **ავტორი:** Arash (Staff SWE / technical due-diligence)
> **თარიღი:** 2026-09-18 · **Branch:** `claude/gracious-volta-ycrs74` (== `main`, HEAD `fc0829b`)
> **მეთოდი:** მხოლოდ კოდის კითხვა + `pnpm check / test / build / audit` sandbox-ში. Production და DB მიუწვდომელი იყო — ყველა „live" რიცხვი ციტირებულია 2026-05 აუდიტიდან (`audit-reports/04-db-content.md`) და ასეა მონიშნული.
> **სფერო:** დიაგნოზი, არა გასწორება. რეპოში არაფერი შეცვლილა.

---

## 1. Executive summary — ჯანმრთელობის მდგომარეობა 10 პუნქტად

1. **Build/typecheck/test სამივე მწვანეა** (0 TS error, 201/202 test pass, build 17 წმ, main chunk 563 KB). კოდის ბაზა *კომპილირდება* და მაისის აუდიტის მოგებები (bundle −78 %, helmet/CSP, rate-limit, Express 5) ადგილზეა.
2. **პროექტი 4 თვეა მიძინებულია.** commit-ები თვეების მიხედვით: აპრ 65 · მაი 119 · ივნ 3 · ივლ 2 · აგვ 2 · სექ 4. მაისის 12-დან სექტემბრის 18-მდე მხოლოდ Copilot-ის ორი „pnpm version" fix-ი და ერთი Dockerfile pin. Railway build 2026-08-12 → 09-18 გატეხილი იყო (`OPS.md`).
3. **P0 — production DB root password ჩაწერილია რეპოში** (`.grantkit-redesign/AUDIT-CONTINUATION-2026-05-03.md`, „Pending Operator Actions" ბლოკი) და Google Maps ორივე გასაღები ჩატში გაჟონილი — rotation გადადებულია მაისიდან.
4. **P0 — გადახდის გზა სავარაუდოდ გატეხილია**: webhook 2026-05-12-დან fail-closed-ია (503 თუ `PADDLE_WEBHOOK_SECRET` არ არის), secret Railway-ის ცნობილ env სიაში არ ფიგურირებს, და migration `0020` (`processed_webhook_events`, რომელშიც webhook INSERT-ს აკეთებს) ოპერატორის მიერ არ არის დადასტურებული.
5. **Paywall მხოლოდ client-side-ია** — `organizations.list/detail/mapPoints`, `catalog.*` ყველა `publicProcedure`. $9/თვე პროდუქტს სერვერზე არაფერი აქვს დაცული. Pivot-ისთვის ეს უფრო *შანსია* (გახსენი) ვიდრე bug.
6. **CI არ არსებობს.** `.github/workflows/` = 2 data-cron; `check/test/build` PR-ზე არ ეშვება; `scripts/` `tsc`-ის გარეთაა — `scripts/create-temp-admin.ts` ორჯერ აცხადებს `const password`-ს და საერთოდ არ კომპილირდება.
7. **Data model გრანტ-ცენტრულია, არა სერვის-ცენტრული.** `organizations` = ~60-სვეტიანი wide table (identity + accessibility + Google + provenance + France + JSON translations); „სერვისი" = CSV `categories` + free-text `servicesOffered`; „პროცედურა" არ არსებობს; ორგანიზაციის თარგმანების JSON არავის უკითხავს.
8. **მონაცემთა ხარისხის ვალი დიდია**: 1,110/1,110 ორგ. `contactEnrichmentStatus=pending`, 779 ტელეფონი / 674 ემაილი provenance-ის გარეშე, 350 orphan grant, ~30 ორგ. „სახელით" `დეტალები`/`მგზავრობა` (Excel header-ები), contact-enrichment cron 130 დღე ზედიზედ ვარდებოდა და 09-18-ს გაითიშა.
9. **ყველა pipeline ოპერატორის ლეპტოპზეა დამოკიდებული** (`MYSQL_PUBLIC_URL` + ლოკალური key-ები): geocoding, translations, France import, backfill, migrations. ერთადერთი ავტომატური — `daily-discovery.yml` (Gemini), რომლის ბოლო კვალი რეპოში 2026-05-12-ია.
10. **დოკუმენტაცია 5 ურთიერთსაწინააღმდეგო „წყაროა"**: გრანტების რიცხვი 624 / 637 / 640 / 643 / 1,102 / 3,650 ერთდროულად; `todo.md` Phase 1-ს ცარიელად აჩვენებს, `STATE.md` — „ALL PHASES COMPLETE"; `PROJECT_MAP` — „pending migrations: none" მაშინ როცა 0020 დაუყენებელია.

**ვერდიქტი:** ფუნდამენტი (React 19 + tRPC + Drizzle + Railway monolith) pivot-ისთვის **სრულიად გამოსადეგია**; გადასაწერი არა სტეკია, არამედ **domain model** (services/procedures/journey) და **operations** (CI, pipelines, secrets). ვალდებულების რიგი: secrets → billing → CI → data model → content.

---

## 2. Verified results — რაც ამ სესიაში გავუშვი

### 2.1 ბრძანებები

| ბრძანება | შედეგი | დრო | შენიშვნა |
|---|---|---|---|
| `pnpm check` (`tsc --noEmit`) | **exit 0, 0 errors** | 12.2 s | `tsconfig.json` include: `client/src`, `shared`, `server`; **`scripts/` არ მოწმდება**, `*.test.ts` გამორიცხულია |
| `pnpm test` (vitest) | **14 files pass, 1 skipped · 201 tests pass, 1 skipped (202)** | 4.7 s | `vitest.config.ts` include: `server/**/*.test.ts` მხოლოდ — client test 0 |
| `pnpm build` | **exit 0** — vite 15.66 s + esbuild | 17 s | `dist/index.js` 212.7 kB, `dist/migrate.js` 785 B |
| `pnpm audit --prod` | **57 vuln: 6 low · 36 moderate · 15 high · 0 critical** | — | high: `lodash`, `lodash-es`, `drizzle-orm`, `mysql2`, `nanoid`, `ip-address`, `tmp`, `brace-expansion`, `fast-xml-builder` |
| `pnpm audit` (dev-იც) | 195 vuln: 12 low · 105 mod · 74 high · 4 critical | — | critical-ები dev tree-შია (`gitnexus` ჯაჭვი) |

### 2.2 Bundle (`dist/public/assets`, 448 ფაილი, 26 MB, JS ჯამში 23.6 MB)

| Chunk | ზომა | ჩატვირთვა | კომენტარი |
|---|---|---|---|
| `index-*.js` (main) | **562.91 kB** | eager | მაისის 563 KB-ს ემთხვევა — რეგრესია არ არის |
| `index-*.css` | 250 KB | eager | Tailwind 4 |
| `index.html` | 2,174 B | — | ✓ |
| `vendor-react` / `vendor-trpc` / `vendor-framer` | 217 / 99 / 122 kB | eager (modulepreload) | |
| `Catalog` / `Admin` / `EntityDetail` / `OrganizationDetail` | 118 / 101 / 61 / — kB | lazy | |
| `Analytics` | 360.65 kB | lazy | recharts + სტატიკური `catalog.json` |
| `AIChatBox` | **909.41 kB** | lazy | `streamdown` → shiki + mermaid + katex |
| `catalogData` (`catalog.json`) | 670.41 kB | lazy | 629-item სნეპშოტი აპრილიდან — ჯერ კიდევ იგზავნება |
| `catalogTranslations` | 1,113.80 kB | lazy (non-EN) | |
| `vendor-csc` (country-state-city) | 8,716.47 kB | lazy | |
| shiki language/theme + mermaid diagram chunks | ~200+ ფაილი, ~12 MB | lazy | ჩატისთვის არასაჭირო (იხ. F14) |

### 2.3 კოდის მოცულობა

| ფაილი | ხაზი | ფაილი | ხაზი |
|---|---|---|---|
| `server/routers.ts` | 1,504 | `client/src/pages/Admin.tsx` | 2,209 |
| `server/db.ts` | 1,964 | `client/src/pages/EntityDetail.tsx` (legacy) | 891 |
| `drizzle/schema.ts` | 367 (10 ცხრილი) | `client/src/pages/Catalog.tsx` | 803 |
| `server/emailService.ts` | 720 | `client/src/pages/OrganizationDetail.tsx` | 612 |
| `client/src/i18n/{en,fr,es,ru,ka}.ts` | ~1,230 თითო · 1,105 key · 365 KB source | `client/src/i18n/types.ts` | 1,311 |
| `scripts/` | 96 entry (35 `stage*.cjs`, 9 `apply-migration`, 39 `.ts`, 15 `.mjs`, 2 `.py`, 3 `.sh`) | `server/*.mjs|cjs` one-off | 13 ფაილი, 2,449 ხაზი |

---

## 3. Findings — რანჟირებული P0 → P3

> Effort: **S** ≤ 2 დღე · **M** ≤ 1 კვირა · **L** > 1 კვირა. Impact — მომხმარებლის/ბიზნესის თვალით.

### P0 — დაუყოვნებლივ

| # | Finding | მტკიცებულება | Impact | Effort |
|---|---|---|---|---|
| **F1** | **Production MySQL root password + public proxy host:port ჩაწერილია commit-ებულ დოკუმენტში.** დამატებით: Google Maps browser + server key ორივე ჩატში გაჟონა 2026-05-04-ს, rotation „post-launch"-ზე გადაიდო. | `.grantkit-redesign/AUDIT-CONTINUATION-2026-05-03.md` — „🚧 Pending Operator Actions" ბლოკი, PowerShell `<pw-assignment pattern>` ხაზი; `OPS.md` §Secret rotation; `PROJECT_MAP.md` Session Log 2026-05-04 | ვინც რეპოს ხედავს (collaborator, fork, leaked token) — სრული DB. მომხმარებელთა profile (health/visa needs) ამავე ბაზაშია. | **S** — Railway MySQL reset + doc purge (+ `git filter-repo` სურვილისამებრ) + 2 GCP key regenerate |
| **F2** | **Billing activation სავარაუდოდ გატეხილია 2026-05-12-დან.** Webhook production-ში fail-closed-ია (503 secret-ის გარეშე); `PADDLE_WEBHOOK_SECRET` Railway-ის დოკუმენტირებულ env სიაში არ არის; `processWebhookEvent` ყოველ event-ზე INSERT-ს აკეთებს `processed_webhook_events`-ში, რომლის migration 0020 „ready for operator to apply" სტატუსშია. | `server/paddleWebhook.ts` (`handleWebhook`: `if (!ENV.paddleWebhookSecret)` → `503` production-ში; `tryRecordProcessedEvent` გამოძახება `processWebhookEvent`-ში); `server/db.ts:1940`; `drizzle/0020_processed_webhook_events.sql`; `scripts/check-migration-0020.mjs` (90fd28e); `OPS.md` „Variables set:" სია; `AUDIT-CONTINUATION` „production currently has no secret per env-var list" | ყოველი წარმატებული Paddle checkout → 503 ან SQL error → `subscriptionStatus` არასდროს ხდება `active`, მომხმარებელი იხდის და ვერაფერს იღებს. Sandbox-იდან ვერ დავადასტურე — **პირველი რიგის შესამოწმებელია**. | **S** — env დაყენება + `node scripts/apply-migration-0020.mjs` + test-mode purchase |

### P1 — pivot-ის დაწყებამდე

| # | Finding | მტკიცებულება | Impact | Effort |
|---|---|---|---|---|
| **F3** | **Paywall client-side-only-ა.** Catalog არა-გამომწერს 3 ჩანაწერს სთხოვს API-ს, მაგრამ API თავად ღიაა. | `client/src/pages/Catalog.tsx:53,174-175` (`PREVIEW_ITEMS = 3`, `pageSize: subStatus?.isActive ? PAGE_SIZE : PREVIEW_ITEMS`); `server/routers.ts:1330` `organizations.list: publicProcedure` (pageSize ≤ 100), `:1368 detail`, `:1382 mapPoints` (≤ 5,000 წერტილი), `:293 catalog.list`. `OrganizationDetail.tsx`-ში subscription check 0. | პროდუქტს ღირებულების საზღვარი არ აქვს; ბრაუზერის DevTools-ით სრული კატალოგი 1 request-ია. Pivot-ისთვის გადაწყვეტილება: ან სერვერზე gate, ან ღიად გამოცხადება (რეკომენდაცია — ღია). | **S** |
| **F4** | **არაავთენტიფიცირებული LLM ხარჯი.** `smartSearch` ორივე namespace-ში public-ია და ყოველ query-ზე Claude Haiku-ს ეძახის, cache-ის გარეშე; ერთადერთი ლიმიტი — 100 req/min/IP baseline. | `server/routers.ts:546,1462` (`smartSearch: publicProcedure`); `server/queryExpander.ts:50-57` (`claude-haiku-4-5-20251001`, `max_tokens: 300`, cache არ არის); `server/_core/bootstrap.ts:136` (`/api/trpc` 100/min). `ai.grantChat` თავად დაცულია (`:1301 protectedProcedure`, `:134` 20/min). | ერთი IP-დან 6,000 LLM call/საათი უფასოდ; distributed — შეუზღუდავი. | **S** — LRU cache normalized query-ზე (`lru-cache` უკვე dependency-ა) + `/api/trpc/catalog.smartSearch` 10/min ან `protectedProcedure` |
| **F5** | **`subscription.cancel` Paddle-ს არ ატყობინებს** — DB-ში `cancelled`, ბარათი იჭრება. | `server/routers.ts:253-271` — მხოლოდ `updateUserSubscription(..., {subscriptionStatus: "cancelled"})` + email; `ENV.paddleApiKey` არსებობს (`env.ts:9`), არ გამოიყენება. | ფინანსური/სამართლებრივი რისკი (chargeback, refund policy). | **S** |
| **F6** | **წლიური გეგმა რეკლამირდება, არ იყიდება.** Home-ზე monthly/annual toggle და „$79/yr" ტექსტი; checkout ყოველთვის ერთ monthly `PADDLE_PRICE_ID`-ს იყენებს. | `client/src/pages/Home.tsx:56,498-527`; `client/src/i18n/en.ts:94,117`; `client/src/hooks/usePaddle.ts:13` (`pri_01kmyg…`), `:99` (`items: [{ priceId: PADDLE_PRICE_ID }]`); client token hardcoded `:10` | ნდობის/consumer-protection საკითხი (loi Toubon/DGCCRF ფრანგული აუდიტორიისთვის). | **S** (ოპერატორი ქმნის annual price-ს) |
| **F7** | **CI gate არ არსებობს; `scripts/` არ ტიპდება; გატეხილი script main-ზეა.** | `.github/workflows/` = `daily-discovery.yml` + `contact-enrichment.yml` მხოლოდ; `tsconfig.json` include ← `scripts/` არ არის; `scripts/create-temp-admin.ts:24-25` ორი `const password` (esbuild: „The symbol "password" has already been declared" — გადავამოწმე), fallback პაროლი `"<hardcoded default password literal — see the file>"` ხაზი 25. | ყოველი PR merge-ი „ბრმაა"; მაისის 3 fire-drill სწორედ ამის შედეგია. | **S** — `ci.yml` (check/test/build on PR) + `scripts/` tsconfig-ში |
| **F8** | **Migration mechanism ორთავიანია.** Dockerfile CMD ყოველ boot-ზე უშვებს drizzle migrator-ს, რომლის journal `0013`-ზე მთავრდება; `0014–0020` ხელით დაწერილი SQL-ია და `apply-migration-00XX.mjs`-ით ეშვება. `schema.ts` უკვე შეიცავს `processed_webhook_events`-ს (0020, დაუყენებელი). `PROJECT_MAP` ამბობს „pending: none, schema in sync". | `Dockerfile` CMD `node dist/migrate.js`; `server/migrate.ts:25-27`; `drizzle/meta/_journal.json` ბოლო tag `0013_far_giant_girl`; `drizzle/0014…0020_*.sql`; `drizzle/schema.ts:358`; `PROJECT_MAP.md:16-18` | შემდეგი `drizzle-kit generate` ძველ snapshot-თან diff-ს გააკეთებს; boot-time migrator ან უსარგებლოა ან საშიში. PR #145-ის ტიპის outage-ის რეცეპტი. | **M** — ერთი მექანიზმის არჩევა (რეკომენდაცია: journal-ის რეგენერაცია 0014–0020-ით, boot-time migrator-ის ამოღება, apply მხოლოდ CI job-იდან) |
| **F9** | **Data-quality ვალი, რომელიც pivot-ს ბლოკავს.** | `audit-reports/04-db-content.md` §8-9 (2026-05-02 live): `contactEnrichmentStatus=pending` 1,110/1,110; `phone_no_provenance` 779, `email_no_provenance` 674; `AUDIT-CONTINUATION` Task 2.2: orphan grants 968 → **350**, ~30 ორგ. header-სახელით; `.github/workflows/contact-enrichment.yml:4-6` — cron 130/130 failed, გათიშული 2026-09-18 | „ვის ვენდობით" — pivot-ის ცენტრალური კითხვა; provenance-ის გარეშე ვერცერთი „last verified" badge ვერ გამოჩნდება. | **M** (script-ები არსებობს; საჭიროა secret + 11 დღე batch + 30 ორგ. ხელით cleanup) |
| **F10** | **Sitemap 404-ს აცხადებს.** `/organizations` სტატიკურ გვერდებშია, App.tsx-ს ასეთი route არ აქვს (`/organizations/:orgId` მხოლოდ). პარალელურად 3 sitemap წყარო. | `server/seoRoutes.ts:14`; `client/src/App.tsx:57,69`; `client/public/sitemap.xml` (8 URL, სტატიკური, stale); `scripts/generate-sitemap.ts` | Crawl budget + Search Console error; ORG-CENTRIC Q2 (URL rename + 301) აპრილიდან შეუსრულებელი. | **S** |

### P2 — pivot-ის პირველ სპრინტში

| # | Finding | მტკიცებულება | Impact | Effort |
|---|---|---|---|---|
| **F11** | ემაილები `onboarding@resend.dev`-იდან იგზავნება (Resend sandbox sender); admin notification **იმავე** მისამართზე მიდის — არავინ იღებს. | `server/emailService.ts:69` (`FROM_EMAIL = "onboarding@resend.dev"`), `:367` (`to: [FROM_EMAIL]`) | verification/reset ემაილები spam-ში; ახალი გამომწერის შეტყობინება იკარგება. DIAGNOSTIC Q5 აპრილიდან ღიაა. | **S** + DNS |
| **F12** | **ორგანიზაციის კონტენტი არ ილოკალიზდება.** `organizations.translations` JSON-ს წერს France import, არავინ კითხულობს; UI raw `description`-ს აჩვენებს. გრანტებს ცალკე `grant_translations` ცხრილი აქვთ 3-დონიანი fallback-ით. | `scripts/import-france-orgs.ts:10-15`; `server/db.ts` / `routers.ts` — `translations` ორგ.-ისთვის 0 read; `client/src/pages/OrganizationDetail.tsx:145,170,319-327`; შედარებისთვის `client/src/lib/localizeEntity.ts:17-30`, `EntityDetail.tsx:141,160` | 5-ენოვანი საიტი, რომლის მთავარი entity ერთენოვანია. | **M** |
| **F13** | **Analytics გვერდი აპრილის სტატიკურ სნეპშოტზეა** (629 item), არა live DB-ზე; `catalog.json` + `catalogTranslations.json` (2 MB) ისევ bundle-შია და Docker runner-შიც კოპირდება server fallback-ისთვის. | `client/src/pages/Analytics.tsx:6,38`; `client/src/data/catalogData.ts`; `EntityDetail.tsx:65,97`; `server/db.ts:620-650,900,936`; `Dockerfile` `COPY --from=builder /app/client/src/data` | მომხმარებელი ხედავს „629 გრანტს" როცა DB-ში 1,102-ია; deferred-issue D1 ნაწილობრივ გადაწყდა (lazy), არა ამოღებით. | **S** (Analytics → admin.stats ან წაშლა) / **M** (static fallback-ის ამოღება) |
| **F14** | `streamdown` ჩატის markdown-ისთვის shiki (200+ ენა/თემა) + mermaid + cytoscape + katex-ს ითრევს → 448 asset, 23.6 MB JS, AIChatBox 909 kB. | `client/src/components/AIChatBox.tsx:7,277`; `node_modules/streamdown/package.json` deps `katex`, `mermaid`, `shiki`; build output | Deploy image, CDN cache, Lighthouse (მაისში mobile 31–39). | **S** — `react-markdown` + `remark-gfm` |
| **F15** | **AI assistant grant-ცენტრულია და client-კონტროლირებადი prompt-ით.** 7 DB tool ყველა `*grants*`; ორგანიზაციის/ფილიალის/housing tool არ არსებობს; system prompt „640-grant DB"; org-კონტექსტი client-ზე იწყობა და user message-ს ემატება. Quota per-user არ არის, history 20 × 5,000 char. | `server/toolboxClient.ts:141-231`; `server/grantAssistant.ts:101-121,127-128` (`claude-haiku-4-5`, `MAX_ITERATIONS 8`, `max_tokens 4096`); `client/src/lib/orgFocusContext.ts:1-13`; `routers.ts:1301-1326` | Pivot-ის „need-based search"-ისთვის tool set გადასაწერია; prompt injection by design (context ≠ system). | **M** |
| **F16** | **Manus scaffolding + one-off-ების ნაგავი production tree-ში.** | `server/_core/{imageGeneration,voiceTranscription,dataApi,map,llm}.ts` 1,091 ხაზი — არსად იმპორტირდება; `server/_core/systemRouter.ts` `notifyOwner` → Forge; `.env.example` `OAUTH_SERVER_URL/OWNER_OPEN_ID`; `users.openId` (`schema.ts:9`); `server/*.mjs|cjs` 13 ფაილი / 2,449 ხაზი; `scripts/stage*.cjs` 35; `pending-imports/` 60 ფაილი; `vite-plugin-manus-runtime`, `@builder.io/vite-plugin-jsx-loc` | Onboarding ხმაური ყოველი ახალი agent/dev-ისთვის; audit surface. (Karpathy §3: ვახსენებ, არ ვშლი.) | **S** |
| **F17** | Session cookie `sameSite: "none"` same-origin აპლიკაციაზე; `express.json({ limit: "50mb" })` გლობალურად. | `server/_core/cookies.ts:45`; `server/_core/bootstrap.ts:143-144` | CSRF surface უმიზეზოდ; memory DoS ვექტორი (rate-limit ამცირებს). | **S** |
| **F18** | Marketing რიცხვები hardcoded და მოძველებული: „640+" 10+ i18n string-ში, `constants.ts`, `index.html`; `manifest.json` „624+"; AI prompt „640-grant"; DB 1,102 grant / 1,110 org. | `client/src/i18n/en.ts:18,21,32,73,74,94,108,125,152,162`; `client/src/lib/constants.ts:7`; `client/public/manifest.json`; `grantAssistant.ts:111` | ნდობა + 5 ენაზე ხელით სინქრონი. | **S** — `catalog.count`/`organizations.count`-იდან რენდერი |
| **F19** | 57 prod CVE (15 high) — `drizzle-orm`, `mysql2`, `nanoid` პირდაპირი deps-ია. | `pnpm audit --prod` (ამ სესიაში) | | **S–M** |

### P3 — ცნობისთვის / pivot-ის დიზაინში გასათვალისწინებელი

| # | Finding | მტკიცებულება |
|---|---|---|
| **F20** | i18n: 5-ივე ლექსიკონი main chunk-შია (`LanguageContext.tsx:2-6`); კატეგორიების label-ები ცალკე hardcoded (`:53-71`) და აკლია `legal_aid`, `mental_health`, რომლებსაც discovery script იყენებს (`scripts/daily-discovery.ts:53-54`); `COUNTRY_LABELS` მხოლოდ US + International (`:73-76`); `/:lang` route არ არსებობს; hreflang არ არსებობს, თუმცა `seoRoutes.ts:4` კომენტარი ამტკიცებს. |
| **F21** | SEO: `react-helmet-async` client-side (`SEO.tsx`), SSR/prerender არ არის; canonical `window.location.origin`-იდან (`:48-50`); JSON-LD მხოლოდ Home + legacy EntityDetail-ზე, `OrganizationDetail.tsx`-ში 0. |
| **F22** | PWA: `manifest.json` ერთი 48×48 favicon-ით; service worker 0; offline 0. |
| **F23** | `organizations` wide table: `languages` CSV (`schema.ts:225`), `categories` CSV LIKE-boundary matching-ით (`db.ts:1479-1486`), `organization_housing` `uniqueIndex(orgId)` → 1 housing/org (`schema.ts:315`), `grants` დუბლირებული address/phone/email/lat/lng (`schema.ts:106-128`). |
| **F24** | Search = `LIKE '%term%'` 5 სვეტზე, FULLTEXT index 0, relevance ranking 0 (`db.ts:1489-1497,1756-1764`; 28 `like(` გამოძახება). 1k row-ზე OK, 10k-ზე — არა. |
| **F25** | Repo: shallow clone (195 commit ხილული); `_journal`/snapshots `0013`-ზე გაჩერებული; `client/public/sitemap.xml` stale. |

---

## 4. Architecture assessment

### 4.1 Backend — `server/`

| ასპექტი | მდგომარეობა | ციტატა |
|---|---|---|
| Entry | `index.ts` (prod) / `index.dev.ts` (dev) → საერთო `bootstrap.ts`; eval-hack ამოღებულია | `server/_core/index.ts:1-11`, `bootstrap.ts:55` |
| Security middleware | helmet + CSP (`unsafe-inline` script/style Maps/Paddle/Radix-ის გამო), rate-limit auth 10/min · ai 20/min · base 100/min, webhook raw-body ← json parser-ამდე, `causeChain` prod-gate | `bootstrap.ts:72-125,130-141`; `trpc.ts:48-53` |
| tRPC | 9 router, ~62 procedure: **public 29** (`auth` 7, `catalog` 10, `organizations` 10, `newsletter` 2), **protected 9** (`subscription` 2, `grants` 2, `onboarding` 4, `ai` 1), **admin 24** | `routers.ts:45-1504` |
| `catalog.*` vs `organizations.*` | ორი პარალელური namespace, 10-10 endpoint, „mirror" კომენტარით; `catalog.*` ცოცხალი consumer-ები: `Home.tsx:67` (count), `Dashboard.tsx:53,58` (list/count), `EntityDetail.tsx` (detail). ORG-CENTRIC გეგმის PR#5 (catalog.* წაშლა) გაუქმდა. | `routers.ts:1322-1327` |
| `db.ts` | 1,964 ხაზი, ~75 export; Drizzle query-builder + 23 raw `sql\`` (LIMIT/OFFSET literal-ად mysql2 bug-ის გამო `:634-650`); org filter logic `buildOrgConditions` DRY-ია; static JSON fallback DB-ის არარსებობისას | `db.ts:614-700,1439-1507` |
| Paywall | `subscription.status.isActive` მხოლოდ UI-ს ინფორმაციაა; სერვერზე არცერთი content procedure არ ამოწმებს | `routers.ts:242-250` |
| Auth | JWT cookie (jose) `sdk.ts`, bcrypt, lockout, verify/reset flow, `users.openId` Manus-ის მემკვიდრეობა | `sdk.ts:5-100`, `routers.ts:61-238` |
| Email | Resend, 5-ენოვანი შაბლონები, sandbox sender | `emailService.ts:69` |
| Paddle | client: hardcoded token + price; server: HMAC + freshness + idempotency + fail-closed — კარგი კოდი, დაუდასტურებელი ოპერაცია | `usePaddle.ts:10,13`; `paddleWebhook.ts` |
| AI | Haiku 4.5, agentic loop ≤8 iteration, 10 tool (7 grant DB + Jina fetch + 2 GrantedAI); smartSearch = Haiku query-expansion → LIKE | `grantAssistant.ts`, `queryExpander.ts`, `smartSearch.ts` |

### 4.2 Data model — `drizzle/schema.ts` (10 ცხრილი)

```
users ──< saved_grants >── grants ──< grant_translations
  │                          │ orgId (nullable FK, 350 NULL)
  │                       organizations ──< organization_branches
  │                          │ translations JSON (dead)
  │                          └── organization_housing (1:1)
newsletter_subscribers   notification_history   processed_webhook_events
```

| კითხვა | პასუხი |
|---|---|
| ორგანიზაცია პირველი კლასისაა? | კი — `orgId` slug, branches, enum-ები `acceptsUndocumented / acceptsUninsured / serviceCost / appointmentPolicy` (`schema.ts:226-233`) ინდექსებით. **ეს pivot-ის ყველაზე ღირებული აქტივია.** |
| „სერვისი" პირველი კლასისაა? | **არა.** `categories` CSV + `mainCategory` + `servicesOffered` TEXT + `emigrationPurpose` CSV (`schema.ts:216,267-275`). ერთი ორგ. = ერთი cost/appointment/language პროფილი, თუმცა რეალურად სერვისები განსხვავდება. |
| „პროცედურა/გზამკვლევი"? | **არ არსებობს.** უახლოესი — `grants.applicationProcess / documentsRequired` TEXT (`schema.ts:112,118`), LLM-ით შევსებული, provenance-ის გარეშე. |
| გრანტი ↔ ორგანიზაცია | `grants.orgId` nullable, 0017-ით დამატებული, 68 % ბმული; `grants`-ს ისევ თავისი phone/email/address/lat/lng აქვს (558 კოორდინატის დუბლიკატი აპრილის დიაგნოსტიკით). PR#3 (NOT NULL + drop) გაუქმდა. |
| თარგმანები | **ორი სისტემა**: `grant_translations` ცხრილი (served, 1,080/1,102 × 4 ენა) vs `organizations.translations` JSON (written, never read). `organization_translations` ცხრილი 0018-ით dropped. |
| Housing | `organization_housing` `uniqueIndex(orgId)` — თავშესაფარი ≠ ორგანიზაცია 1:1 რეალობაში (ერთ ორგ.-ს რამდენიმე თავშესაფარი აქვს). |
| Provenance | `phoneSource/phoneVerifiedAt/emailSource/emailVerifiedAt/contactEnrichmentBatch/Status` (`:250-257`) — სქემა მზადაა, მონაცემი 0. |
| Users profile | `targetCountry`, `purposes/needs` (+details) TEXT CSV (`:34-39`), typed `shared/profileTypes.ts` — journey-ს საწყისი, progress state 0. |

**კოჰერენტულობის ვერდიქტი:** მოდელი „org + programs (grants)"-ისთვის კოჰერენტულია; „org + **services** + **procedures**"-ისთვის — **არა**. საჭიროა 2 ახალი entity (`services`, `guides/procedures` + `guide_steps`) და `grants`-ის დეგრადაცია „program"-ად, ხოლო `organizations` wide table-ის დაშლა არ არის აუცილებელი (Simplicity First).

### 4.3 Frontend — `client/src/`

| ასპექტი | მდგომარეობა |
|---|---|
| Routing | wouter, 22 route `App.tsx:50-71`; lazy ყველაფერი გარდა Home/Login/auth; `/grant/:id` legacy (EntityDetail 891 ხაზი + `computeMatch/parseList/MatchSummary`), `/organizations/:orgId` primary; `/organizations` list **არ არსებობს** |
| i18n | typed dictionaries (`types.ts` 1,311 ხაზი → compile-time parity, 1,105 key), `useLanguage().t` consumption; DB კონტენტი: გრანტებისთვის API `translations[lang]` → static JSON → raw (`localizeEntity.ts`); ორგ.-ისთვის — არაფერი. Language persist `localStorage` (`LanguageContext.tsx:90-98`), URL-ში არა. |
| Static data | `data/catalog.json` 765 KB (629 item, აპრილი) + `catalogTranslations.json` 1.2 MB + `catalogPreview.ts` — lazy chunks, importers: `EntityDetail.tsx:65`, `Analytics.tsx:6`, `LanguageContext.tsx:19` |
| SEO | `SEO.tsx` helmet; `JsonLd.tsx` (Organization/WebSite/FAQ/GovernmentService) Home + EntityDetail-ზე; sitemap dynamic + stale static; hreflang 0; SSR 0 |
| PWA | manifest only |
| Admin | `Admin.tsx` 2,209 ხაზი: grants CRUD, translations editor, users/roles/subscription, newsletter send, CSV/Excel import, GrantedAI import; **organizations/branches/housing editing — 0** (`admin` router-ში org procedure არ არსებობს) |
| Mobile | `MobileHeader/MobileBottomNav/MobileCatalogView`, pull-to-refresh; Lighthouse mobile 31–39 (2026-05-03) |

### 4.4 Tests & CI

| | |
|---|---|
| ფაილები | 15 (`server/*.test.ts`): admin 9 · catalog 34 · catalog.state 13 · emailService 11 · enrichment 13 · export 8 · grants 6 · import 25 · newsletter 27 · paddleWebhook 22 · phase2 7 · seo 15 · subscription 11 · auth.logout 1 · resend-key 1 (skipped) |
| რას ამოწმებს | tRPC procedure-ების auth boundary + input/output shape `vi.mock`-ით DB-ზე; webhook signature/freshness/idempotency pure functions; CSV parsing; email HTML builders |
| რას **არ** ამოწმებს | `organizations.*` (0 test), `ai.*`, `onboarding.saveProfile/getProfile`, France import, ნებისმიერი client component, e2e, migration-ები |
| CI | **არცერთი workflow არ უშვებს ტესტებს.** |

### 4.5 Scripts & pipelines

| Pipeline | მექანიზმი | ვინ უშვებს | სტატუსი |
|---|---|---|---|
| Daily discovery → import → translate | `daily-discovery.yml` cron 08:00 UTC; Gemini via `ENRICHMENT_API_*` | GitHub Actions | ბოლო რეპო-კვალი 2026-05-12 (`pending-imports/2026-05-12.json`); Actions ისტორია sandbox-იდან უხილავია |
| Contact enrichment (Phase B) | `contact-enrichment.yml` → `enrich-org-contacts.ts` (Google Places + domain-validated scraping) | GitHub Actions | **გათიშული 2026-09-18**, 130/130 failed — secret არასდროს დაემატა |
| Geocoding grants/branches | `geocode-*.ts` | ოპერატორი ლოკალურად, `MYSQL_PUBLIC_URL` + server key | 94 % branches (მაისი) |
| Translations | `audit-translations.ts` / `translate-missing.ts` | ოპერატორი | 22 missing (მაისი) |
| France import | `import-france-orgs.ts` | ოპერატორი | შესრულებულია (1,110 org მაისში; xlsx რეპოში არ არის) |
| Migrations | `apply-migration-00XX.mjs` | ოპერატორი | 0020 pending |
| Country/orgId/dup fixes | `fix-country-codes / backfill-grants-orgid / merge-org-duplicates` | ოპერატორი | ერთჯერადი |

**შეფასება:** 96 script, 24 `package.json`-იდან მისამართებადი; ღირებული core — ~12 ფაილი (`_lib/`, discovery, import-new-grants, import-france-orgs, enrich-org-contacts, geocode-*, translate-*, audit-db-content, apply-migration template). დანარჩენი ისტორიაა.

### 4.6 Infra — monolith on Railway

**ვერდიქტი: მონოლითი კარგია, კონსტრეინტი ოპერაციებია.** 1,110 org / 0 user მასშტაბზე ერთი Express + SPA კონტეინერი სწორი არჩევანია; Dockerfile sane-ია (multi-stage, pnpm pinned, `/healthz`, restart policy). რეალური შეზღუდვები: (a) staging არ არსებობს — ყველა PR პირდაპირ prod-ზე მიდის; (b) migrator boot-ზე stale journal-ით; (c) DB-ს public proxy ლეპტოპებისთვის; (d) build-time `VITE_*` args → key-ების ცვლილება = rebuild. არცერთი არ მოითხოვს არქიტექტურის ცვლილებას — მოითხოვს CI job-ებს და Railway-ის staging environment-ს.

---

## 5. დოკუმენტაციის წინააღმდეგობები

| თემა | წყარო A | წყარო B | წყარო C | რეალობა (ვერიფიცირებული) |
|---|---|---|---|---|
| გრანტების რაოდენობა | `CLAUDE.md` „643+" / „637 active" · `STATE.md` „637" · `ORG-CENTRIC` „637" | `todo.md` „3,650+" | `PROJECT_MAP` ცხრილი „643+", Session Log „1,102 active"; i18n „640+"; manifest „624+"; static JSON 629 | `audit-reports/04-db-content.md`: **1,113 (1,102 active)** 2026-05-02 |
| ორგანიზაციების რაოდენობა | `ORG-CENTRIC` 538 · `schema.ts:197` კომენტარი 538 | `PROJECT_MAP` „790 orgs" | `04-db-content.md` 1,110 | **1,110** (France import შემდეგ) |
| Phase 1 (Onboarding/Dashboard/Smart Search) | `todo.md` `[ ]` ცარიელი | `CLAUDE.md` ✅ ყველა | კოდი: `Onboarding.tsx`, `StepCountry/Purpose/Needs`, `smartSearch` | **გაკეთებულია** |
| Auth | `todo.md` „Manus OAuth" · `.env.example` `OAUTH_SERVER_URL` | `CLAUDE.md`/`PROJECT_MAP` email/password JWT | `sdk.ts`, `routers.ts:61-238` | email/password; OAuth მკვდარი |
| Deploy | `todo.md` „Railway shows default page; Vercel working" | `CLAUDE.md` Railway primary | `railway.toml`, `vercel.json` rewrites → Railway | Railway |
| Stack ვერსიები | `STATE.md` „Express 4.21.2, pnpm 10.4.1, 6 tables" | `AUDIT-CONTINUATION` Express 5, pnpm 10.33.2 | `package.json` `express ^5.1.0`, `pnpm@10.33.2`; `schema.ts` 10 ცხრილი | B |
| „Current phase" | `PROJECT_MAP` „Contact enrichment Phase B (scraping script)" | `MASTER-ROADMAP` „scraper script ჯერ არ შექმნილა" | `DIAGNOSTIC-04-25` „script 460 ხაზი, main-შია"; `STATE.md` „ALL PHASES COMPLETE" | script არსებობს; cron გათიშული; ფაზა „paused" |
| Branches A/B | `MASTER-ROADMAP` „24K ხაზი unmerged" | `DIAGNOSTIC-04-25` „ორივე 0 ahead, merged" | `AUDIT-CONTINUATION` „active branch claude/grantkit-audit-continue-7mEhS" | `git branch -r`: **მხოლოდ `main`** |
| Migrations | `PROJECT_MAP` „applied 0011 + 0012–0016; pending none; schema.ts in sync" | `AUDIT-CONTINUATION` „0020 ready for operator" | `drizzle/` 0000–0020; journal → 0013 | 0017–0019 de facto applied (Task 2.2 იყენებდა `orgId`, `geocodedAt`), 0018 applied (France columns prod-ზე მუშაობს), **0020 unverified** |
| `Catalog.tsx` freeze | `ORG-CENTRIC` §5 „FROZEN, ნებართვა საჭირო" | `CLAUDE.md`/`PROJECT_MAP` un-frozen (PR #194) | — | un-frozen |
| `routers.ts` ზომა | `CLAUDE.md` „~960 ხაზი"; tRPC სია `organizations.*`/`onboarding.*`-ის გარეშე | `PROJECT_MAP` სრული სია | `wc -l` | **1,504** |
| Railway env vars | `CLAUDE.md` `JWT_SECRET, PADDLE_*, RESEND_API_KEY, BUILT_IN_FORGE_*` | `OPS.md`/`PROJECT_MAP` `DATABASE_URL, ANTHROPIC_API_KEY, NODE_ENV, PORT, VITE_GOOGLE_MAPS_*` მხოლოდ | — | **უცნობია** — F2-ის მიზეზი |
| Bundle | `deferred-issues.md` D1 „632 KB gzip catalogData-ს გამო" | `AUDIT-CONTINUATION` 563 KB | build ამ სესიაში 562.91 kB (catalogData lazy) | D1 stale |
| Phase 2 org-centric | `ORG-CENTRIC` „Wave 1 გასაშვებად მზადაა", 6 persona | `EXECUTION-PLAN` „ARCHIVED" | `MASTER-ROADMAP` „PR#3-5 გაუქმდა" | archived; pivot-ის ხედვა (§1) ცოცხალია, გეგმა — არა |

**რეკომენდაცია — ერთი წყარო:**

1. **`PROJECT_MAP.md` = Single Source of Truth** (უკვე ასეა დეკლარირებული). დაემატოს სექცია „Numbers" რომელიც *არასდროს* იწერება ხელით — `pnpm audit:db` output-ის (`audit-db-content.ts`) commit-ებული `STATUS.json`-იდან იკითხება, თარიღით.
2. **`CLAUDE.md`** დარჩეს მხოლოდ *წესებად* (migration golden rule, pnpm, `/api/trpc`, i18n 5 ენა) + პოინტერი; ყველა რიცხვი და „phase progress" წაიშალოს.
3. **`OPS.md`** დარჩეს runbook-ად, დაემატოს Railway env var-ების *სრული* ჩამონათვალი (სახელები).
4. **`.grantkit-redesign/_archive/`**-ში გადავიდეს: `STATE.md`, `todo.md`, `MASTER-ROADMAP-2026-04-25.md`, `DIAGNOSTIC-2026-04-23/25.md`, `EXECUTION-PLAN.md`, `HANDOFF-*.md`, `PLAN-france-orgs-import.md`, `TEAM_ROSTER.md`, `ideas.md`, `LAUNCH-REPORT.md`, `audit-phase7.md`, `*.pptx`, `location-audit-report.json` (466 KB). `AUDIT-CONTINUATION` — **secret-ის purge-ის შემდეგ**.
5. **`ORG-CENTRIC-MEMORY.md` §1** (სტრატეგია) გადავიდეს ახალ `PIVOT.md`-ში; დანარჩენი archive.
6. **`deferred-issues.md`** გახდეს GitHub Issues (D1 დახურვა, D5 pivot-ის ნაწილი).

---

## 6. Pivot-readiness matrix — 14 capability

| # | Capability | სტატუსი | რა არსებობს / რა გამოვიყენოთ | Effort | რისკი |
|---|---|---|---|---|---|
| 1 | Org directory + accessibility signals | **exists (partial quality)** | `organizations` + `organization_branches` + enum ველები (`schema.ts:225-233`) + `WhoWeHelpCard`, `TrustPanel`, `OrganizationsMap`, `Catalog.tsx` split view, `organizations.*` API, sitemap. ხარისხი: enrichment 0/1,110, provenance 0, 30 garbage org, TrustPanel მხოლოდ Google rating-ს აჩვენებს | **M** (მონაცემი), **S** (UI) | ნდობა — ვერ ვამბობთ ვინ როდის გადაამოწმა |
| 2 | Services as first-class | **missing** | `servicesOffered` TEXT, `categories` CSV, `grants` (=programs) `orgId`-ით, France `emigrationPurpose`. ახალი `services` ცხრილი (orgId, type enum, eligibility, cost, languages, docsRequired, lastVerifiedAt, source) + import/mapping + UI + admin | **L** | grants → services მიგრაცია: 1,102 „grant" რეალურად ~40 % სერვისია (resource type) — კლასიფიკაცია LLM-ით + review |
| 3 | Country procedures / guides (versioned, translated) | **missing** | არაფერი; `applicationProcess/documentsRequired` TEXT ნიმუშად. საჭიროა content entity (`guides`, `guide_steps`, `guide_versions`, 5 ენა), editor, rendering, linking org/service-თან | **L** | ეს არის pivot-ის *ბირთვი*; Admin.tsx-ის გაფართოება ჩიხია — headless CMS (Markdown in repo / Payload / Directus) განსახილველია |
| 4 | Stage-based checklists / journey state | **partial** | Onboarding 3-step → `users.targetCountry/purposes/needs` (`profileTypes.ts`), Dashboard რეკომენდაციები (`Dashboard.tsx:53-93`, ისევ `catalog.*`-ზე), `saved_grants` bookmarks. აკლია: journey stage, checklist items, progress, org/service save | **M** | privacy — health/visa კატეგორიები (იხ. #14) |
| 5 | Multilingual pipeline (AI + review) | **partial** | UI 100 % typed (`types.ts`); grants 1,080/1,102 × 4 ენა (`translate-missing.ts`, Gemini); org JSON dead (F12); review workflow 0; ყველაფერი operator-run | **M** | ორი თარგმანის სისტემა → ერთი (`entity_translations(entityType, entityId, lang, field, text, source, reviewedAt)`) |
| 6 | Language-aware URLs + SEO (hreflang, prerender) | **missing** | `SEO.tsx`, `JsonLd.tsx`, dynamic sitemap — ბაზა კარგია; `/:lang` route 0, hreflang 0, SSR 0, sitemap 404 (F10), org JSON-LD 0 | **M** (crawler-side prerender middleware `/organizations/:id` + `/guides/*` + hreflang) · **L** (სრული SSR/Vite SSR) | wouter → `/:lang/…` refactor 22 route-ს ეხება |
| 7 | Need-based search | **partial** | `smartSearch` (Haiku expand → LIKE, `queryExpander.ts`), AI assistant (grant tools only), 5-ენოვანი query detection. აკლია: org/service tools, FULLTEXT/embedding, profile-aware ranking | **M** | ხარჯის კონტროლი (F4) ჯერ |
| 8 | Notifications / alerts | **partial** | `newsletter_subscribers`, `sendBatchNewGrantNotifications`, `notification_history`, discovery `--notify`, Resend 5-ენოვანი. აკლია: saved search, per-user digest, brand sender (F11), org-centric scope (Q6) | **M** | Resend DNS ოპერატორზეა |
| 9 | Community / feedback loop | **missing** | არაფერი. მინიმალური: `content_feedback(entityType, entityId, verdict, note, lang, createdAt)` + „ეს ინფორმაცია სწორია?" ღილაკი + admin სია | **S–M** | spam/abuse — rate-limit არსებობს |
| 10 | Freshness + provenance UI | **partial** | სქემა მზადაა (`*Source/*VerifiedAt`, `geocodedAt`, `updatedAt`, `contactEnrichmentBatch`); UI 0 (TrustPanel მხოლოდ rating); მონაცემი 0 | **S** UI + **M** data (F9) | „unknown" badge უნდა იყოს პატიოსანი, არა ცარიელი |
| 11 | Admin / editor CMS non-dev-ისთვის | **partial (grants only)** | `Admin.tsx` 2,209 ხაზი: grants CRUD + translations editor + import/export + users. Org/branch/housing/service/guide editing 0. | **L** (custom) · **M** (headless CMS guide-ებისთვის + მცირე org editor) | ერთ 2k-ხაზიან ფაილში გაფართოება უსაფრთხო არაა |
| 12 | Analytics / telemetry | **missing** | `index.html:31` analytics გათიშულია; `Analytics.tsx` = სტატიკური data-viz (F13); `admin.stats`. Event tracking 0, funnel 0, „did the user find help" 0 | **S** (Umami/Plausible self-host, cookieless) + **M** (outcome events: org contacted, guide step done) | GDPR — cookieless აუცილებელი |
| 13 | Mobile / PWA / offline | **partial** | responsive layouts, bottom nav, pull-to-refresh, manifest; SW 0, offline 0, Lighthouse mobile 31–39 (LCP 8–13 s) | **M** | Maps + AIChatBox weight; offline guides = კარგი use case (Workbox precache guides) |
| 14 | Trust & safety / privacy | **partial** | helmet/CSP, rate-limit, bcrypt, lockout, httpOnly cookie, self-hosted fonts (no 3rd-party tracking). აკლია: consent record, data minimisation (purposes/needs plaintext — health, undocumented status), account deletion endpoint (`auth.deleteAccount` არ არსებობს), retention policy, AI chat → Anthropic დისკლოზერი, `sameSite: none` (F17), secrets in repo (F1) | **M** | ყველაზე მოწყვლადი აუდიტორია; RGPD/CNIL საფრანგეთისთვის |

**ხედვა:** 14-დან **exists 1 · partial 8 · missing 5**. „missing" ხუთი (services, guides, lang URLs, feedback, telemetry) სწორედ პროდუქტის ახალი ბირთვია — ანუ pivot არის *build*, არა *refactor*.

---

## 7. Reuse vs rebuild

| კომპონენტი | გადაწყვეტილება | არგუმენტი |
|---|---|---|
| Stack (React 19, Vite, tRPC 11, Drizzle, MySQL, Railway) | **Reuse** | მწვანე build/test, მოდერნული, ერთი კონტეინერი; 0 მიზეზი გადასაწერად |
| `organizations` + `organization_branches` + enum accessibility + provenance სვეტები | **Reuse** | pivot-ის ყველაზე ღირებული აქტივი; wide table დარჩეს, არ დაიშალოს (Simplicity First) |
| `organizations.*` tRPC + `Catalog.tsx` + `OrganizationsMap` + `OrganizationDetail.tsx` | **Reuse, extend** | ამ ზედაპირზე დაშენდება services/guides ბლოკები |
| `catalog.*` namespace + `EntityDetail.tsx` + `computeMatch/parseList/MatchSummary` + `/grant/:id` | **Retire** (301 → org page) | legacy აპრილიდან; Dashboard/Home 2 call-ს გადაიტანს `organizations.*`-ზე |
| `grants` ცხრილი | **Reuse as `programs`/`services` წყარო** | 1,102 row-ის LLM კლასიფიკაცია service vs program; address/contact სვეტები ignore |
| `grant_translations` | **Generalize** → `entity_translations` | ერთი მექანიზმი org/service/guide-ისთვის; `organizations.translations` JSON — drop |
| i18n dictionaries + `types.ts` | **Reuse** | compile-time parity კარგი; lazy-load per language (S) |
| Onboarding + `profileTypes.ts` + Dashboard | **Reuse, extend** | journey stage + checklist ემატება, არა იწერება |
| AI assistant (`grantAssistant.ts`, `AIChatBox`) | **Reuse loop, rebuild tools + prompt** | agentic loop/Jina fetch კარგია; tool set org/service/guide-ზე; context სერვერზე აიგოს, არა client-ზე; `streamdown` → `react-markdown` |
| `smartSearch` + `queryExpander` | **Reuse + cache** | S ცვლილება; მოგვიანებით FULLTEXT ან embeddings |
| Paddle billing | **Decide first** | თუ pivot უფასო/დონაციაა — მთელი Paddle ჯაჭვი (webhook, PricingCTA, subscription router, 33 test) ამოსაღებია (S); თუ რჩება — F2/F5/F6 (S×3) |
| `Admin.tsx` | **Keep for grants; do not extend** | guides/services-ისთვის ცალკე editor ან headless CMS |
| `Analytics.tsx` | **Retire** | სტატიკური სნეპშოტი; ჩაანაცვლოს telemetry |
| `client/src/data/*.json` + server static fallback | **Retire** | 2 MB, აპრილის სნეპშოტი, DB-fallback ილუზია |
| Scripts: discovery, import-new-grants, import-france-orgs, enrich-org-contacts, geocode-*, translate-*, audit-db-content, `_lib/` | **Reuse, move to GH Actions** | ოპერატორის ლეპტოპიდან → secrets-ით CI job |
| `stage*.cjs`, `server/*.mjs|cjs`, `pending-imports/`, `_core` Manus modules | **Archive/delete** | 1 PR, 0 რისკი |
| Migration mechanism | **Rebuild (choose one)** | F8 |

---

## 8. Top 10 ტექნიკური ნაბიჯი — რიგით, „done when" კრიტერიუმით

| # | ნაბიჯი | Effort | Done when (ვერიფიცირებადი) |
|---|---|---|---|
| 1 | **Secrets:** Railway MySQL root password reset; Google Maps browser + server key regenerate; password purge `AUDIT-CONTINUATION`-იდან (+ history rewrite გადაწყვეტილება); `OPS.md`-ში Railway env სახელების სრული სია | S | `git grep -n "mainline.proxy.rlwy.net\|<pw-assignment pattern>" ` → 0; ძველი credential-ით `mysql` connect → access denied; `OPS.md` env ცხრილში `PADDLE_WEBHOOK_SECRET`, `JWT_SECRET`, `RESEND_API_KEY` ფიგურირებს |
| 2 | **Billing გადაწყვეტილება + გასწორება:** (a) pivot უფასოა → Paddle ჯაჭვის ამოღება; (b) რჩება → `PADDLE_WEBHOOK_SECRET` Railway-ზე, `apply-migration-0020.mjs`, `cancel` Paddle API-ით, annual price ან toggle-ის წაშლა | S | (b): `node scripts/check-migration-0020.mjs` → table exists; Paddle sandbox purchase → `users.subscriptionStatus='active'` ≤ 30 წმ; cancel → Paddle dashboard status `canceled`; Home-ზე რეკლამირებული ყველა გეგმა checkout-ში არსებობს |
| 3 | **CI:** `.github/workflows/ci.yml` — `pnpm install --frozen-lockfile && pnpm check && pnpm test && pnpm build` PR-ზე და main-ზე; `scripts/` `tsconfig`-ში (ან `tsconfig.scripts.json`); `create-temp-admin.ts` fix ან წაშლა; branch protection | S | PR ვერ merge-დება წითელი check-ით; `pnpm check` scripts/-ის ჩათვლით 0 error; `esbuild scripts/create-temp-admin.ts` exit 0 |
| 4 | **Cost & gating:** `smartSearch` → LRU cache (normalized query, 24 სთ) + 10/min/IP; `sameSite: "lax"`; `express.json` 2 MB (import route-ს ცალკე 50 MB); paywall გადაწყვეტილება სერვერზე აისახოს (gate ან წაშლა) | S | ერთი და იგივე query ×2 → 1 Anthropic call (log); anon 11-ე smartSearch/წთ → 429; `curl /api/trpc/organizations.list?pageSize=100` ანონიმურად → 200 (თუ ღია) ან 401 (თუ gated) — ერთ-ერთი, არა ორივე |
| 5 | **Migration mechanism ერთი:** journal/snapshots რეგენერაცია 0014–0020-ით (`drizzle-kit generate` DB-ს წინააღმდეგ ან ხელით `_journal.json`), Dockerfile CMD-დან `migrate.js` ამოღება, apply მხოლოდ CI job-იდან golden rule-ის დაცვით | M | `drizzle-kit check` clean; fresh DB-ზე `drizzle-kit migrate` → 0000–0020 ყველა; Dockerfile CMD = `node dist/index.js` |
| 6 | **Data quality sprint:** `GOOGLE_MAPS_API_KEY` GitHub Secrets-ში, contact-enrichment cron ჩართვა, 30 garbage org merge/deactivate (`merge-org-duplicates.ts`), 350 orphan grant review, `audit:db` → `STATUS.json` commit ყოველ run-ზე | M | `STATUS.json`: `contactEnrichmentStatus=pending` < 100; `phone_no_provenance` < 100; orgs with name matching `^(დეტალები\|მგზავრობა\|…)$` = 0; workflow run 7 დღე ზედიზედ green |
| 7 | **Docs consolidation:** §5-ის რეკომენდაცია — `PROJECT_MAP` + `CLAUDE.md`(წესები) + `OPS.md` + `PIVOT.md`; დანარჩენი `_archive/`; რიცხვები `STATUS.json`-იდან | S | `.grantkit-redesign/*.md` (non-archive) ≤ 5 ფაილი; `grep -rn "640+\|643\|3,650" .grantkit-redesign/*.md CLAUDE.md` → 0; PROJECT_MAP „Migrations" ცხრილი = `drizzle/` ფაილების სია |
| 8 | **Domain model v2 (pivot foundation):** migration 0021 — `services`, `guides`, `guide_steps`, `entity_translations`, `content_feedback`; `organizations.translations` JSON → `entity_translations`; `grants` → `programs` (view ან rename); `organization_housing` unique index → non-unique; ADR დოკუმენტი | L | migration Railway-ზე golden rule-ით; `organizations.detail` აბრუნებს `services[]`, `guides[]`, `translations` ენის მიხედვით; France 624 org-ის `translations` JSON 100 % გადატანილი (`SELECT COUNT(*) FROM entity_translations WHERE entityType='organization'` ≥ 624×N); 1 e2e test org page-ზე ka/fr |
| 9 | **Public surface pivot:** `/organizations` list route + 301 `/catalog`→`/organizations`, `/grant/:id`→`/organizations/:orgId`; `/:lang` prefix + hreflang + org JSON-LD; crawler prerender middleware org/guide გვერდებზე; `EntityDetail`/`catalog.*` retire; `Analytics`/static JSON retire; `streamdown` → `react-markdown` | M | `curl -A Googlebot /fr/organizations/ORG-0061` → HTML `<title>` + `hreflang` ×5 JS-ის გარეშე; sitemap-ის ყოველი URL → 200; `dist/public/assets` < 100 ფაილი; Lighthouse mobile `/organizations/:id` ≥ 60 |
| 10 | **Journey + feedback + telemetry MVP:** `user_journey(userId, countryCode, stage, checklist JSON, updatedAt)`, Dashboard stage view; „ეს სწორია?" ღილაკი org/service/guide-ზე → `content_feedback`; cookieless analytics (Umami self-host) + 5 outcome event; account deletion endpoint + consent record | M | ახალი user: onboarding → stage 1 checklist ჩანს → item ✓ → reload-ზე რჩება; feedback INSERT ჩანს admin-ში; Umami-ში `org_contact_clicked` event 24 სთ-ში ≥ 1; `auth.deleteAccount` → user + journey + saved rows 0 |

**კრიტიკული გზა:** 1 → 2 → 3 → 5 → 8. ნაბიჯები 4, 6, 7 პარალელურად; 9, 10 — 8-ის შემდეგ.

---

## დანართი A — რიცხვები, რომლებზეც ეს ანგარიში ეყრდნობა

| რიცხვი | წყარო |
|---|---|
| 0 TS error · 201/202 test · build 17 s · main 562.91 kB · 448 asset · 23.6 MB JS · 57 prod CVE | ამ სესიის `pnpm check/test/build/audit` output |
| 29 commit, 14 merge, 34 ფაილი +2,728/−138 since 2026-05-04 | `git log --since=2026-05-04`, `git diff --stat 7ae690a..HEAD` |
| commit/თვე 65/119/3/2/2/4 | `git log --format=%ad` (shallow clone — აბსოლუტური ისტორია არასრულია) |
| 1,113 grants (1,102 active), 1,110 orgs, 1,324 branches, 1,080 translations/lang, 0 users, 968→350 orphan, 1,110 pending enrichment, 779/674 no-provenance | `audit-reports/04-db-content.md` (2026-05-02 live) + `AUDIT-CONTINUATION` Task 2.2 (2026-05-04) — **არა ამ სესიის** |
| 130/130 failed cron runs | `.github/workflows/contact-enrichment.yml:4-6`, `OPS.md` |
| Lighthouse mobile 31–39 | `audit-reports/09-lighthouse-baseline.md` (2026-05-03) |

## დანართი B — რა *ვერ* გადავამოწმე

- Railway env var-ების რეალური მდგომარეობა (`PADDLE_WEBHOOK_SECRET`, `JWT_SECRET`, `RESEND_API_KEY`) — F2 ამიტომაა „სავარაუდოდ".
- Migration 0017–0020 prod სტატუსი — დასკვნა ირიბია (Task 2.2 script-ები მუშაობდნენ; `db.select()` ვერ იმუშავებდა 0018-ის სვეტების გარეშე).
- GitHub Actions run history (`daily-discovery` მუშაობს თუ არა მაისის შემდეგ).
- Live DB-ის დღევანდელი რიცხვები — ყველა მაისისაა.
- Production URL-ის ქცევა (403 proxy).
