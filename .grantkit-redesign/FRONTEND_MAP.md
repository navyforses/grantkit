# FRONTEND_MAP — Phase C დელივერი

> ფაზა C. გვერდი-გვერდი / კომპონენტი-კომპონენტი tRPC endpoint ჩარტი
> შედგენილია: 2026-04-23
> წყარო: `rg "trpc\.\w+\.\w+\.(useQuery|useMutation|useSuspenseQuery)"` on `client/src/pages/` + `client/src/components/`
> გაგრძელებაა: DIAGNOSTIC-2026-04-23.md (Phase A) + DATA_MAP.md (Phase B)

---

## 0. TL;DR — სამი მთავარი აღმოჩენა

1. **Catalog.tsx უკვე 90%-ით გადატანილია `organizations.*`-ზე.** frozen ფაილი, რომელსაც CLAUDE.md კრძალავს, სინამდვილეში მხოლოდ ერთ `catalog.*` endpoint-ს იძახებს (`catalog.count`, ხაზი 508). სხვა 11 tRPC call უკვე `organizations.*` namespace-ზეა.
2. **`catalog.*` namespace-ის ცოცხალი მომხმარებლები 3 გვერდია:** Home (preview + count), Dashboard (list + count), EntityDetail (detail). consolidation-ის ფარგლები Phase E-ში მცირდება.
3. **`organization_translations` ცხრილი 0-ჯერ გამოიყენება frontend-ზე.** არცერთი გვერდი, არცერთი კომპონენტი ამ ცხრილიდან მონაცემს არ კითხულობს. უსაფრთხოდ ჩამოაგდება (DATA_MAP §7-ს აყალიბებს).

---

## 1. მარშრუტები → გვერდები

ვუთარი `client/src/App.tsx` (Switch + Route pattern):

| URL | Page file | Auth | Roles |
|---|---|---|---|
| `/` | Home.tsx | public | all |
| `/login` | Login.tsx | public | all |
| `/register` | Register.tsx | public | all |
| `/verify-email` | VerifyEmail.tsx | public | all |
| `/forgot-password` | ForgotPassword.tsx | public | all |
| `/reset-password` | ResetPassword.tsx | public | all |
| `/catalog` | Catalog.tsx | public (gated) | all |
| `/grant/:id` | EntityDetail.tsx | public (gated) | all |
| `/organizations/:orgId` | OrganizationDetail.tsx | public (gated) | all |
| `/profile` | Profile.tsx | auth | user/admin |
| `/dashboard` | Dashboard.tsx | auth | user/admin |
| `/onboarding` | OnboardingFlow (component) | auth | new users |
| `/ai-assistant` | AiAssistant.tsx | auth | all |
| `/contact` | Contact.tsx | public | all |
| `/admin` | Admin.tsx | auth | admin only |
| `/analytics` | Analytics.tsx | auth | admin only |
| `/privacy` | Privacy.tsx | public | all |
| `/terms` | Terms.tsx | public | all |
| `/refund` | Refund.tsx | public | all |
| `*` | NotFound.tsx | public | all |

---

## 2. გვერდი × endpoint მატრიცა

ცხრილი: რა რა გვერდი რომელ tRPC endpoint-ს იძახებს. გადასახედია თუ რომელი გვერდია "catalog.* dependent" (პრობლემური, Phase E-ში უნდა გადაიკეთოს).

### 2.1. Public / Marketing გვერდები

| გვერდი | endpoint | ტიპი | ფაილი:ხაზი | შენიშვნა |
|---|---|---|---|---|
| **Home.tsx** | `catalog.preview` | Query | :63 | **catalog.* dependent** |
| | `catalog.count` | Query | :67 | **catalog.* dependent** |
| | `newsletter.subscribe` | Mutation | :117 | ok |
| **Login.tsx** | `auth.login` | Mutation | :23 | ok |
| **Register.tsx** | `auth.register` | Mutation | :22 | ok |
| **VerifyEmail.tsx** | `auth.verifyEmail` | Mutation | :11 | ok |
| **ForgotPassword.tsx** | `auth.forgotPassword` | Mutation | :15 | ok |
| **ResetPassword.tsx** | `auth.resetPassword` | Mutation | :19 | ok |
| **Contact.tsx** | `system.notifyOwner` | Mutation | :30 | ok |
| **Privacy.tsx** | — | — | — | სტატიკური |
| **Terms.tsx** | — | — | — | სტატიკური |
| **Refund.tsx** | — | — | — | სტატიკური |
| **NotFound.tsx** | — | — | — | სტატიკური |

### 2.2. ძირითადი პროდუქტის გვერდები

| გვერდი | endpoint | ტიპი | ფაილი:ხაზი | შენიშვნა |
|---|---|---|---|---|
| **Catalog.tsx** (frozen) | `subscription.status` | Query | :145 | auth gating |
| | `organizations.list` | Query | :180 | canonical |
| | `organizations.smartSearch` | Query | :191 | canonical |
| | `organizations.regions` | Query | :206 | canonical |
| | `organizations.categoryCounts` | Query | :207 | canonical |
| | `organizations.countries` | Query | :213 | canonical |
| | `organizations.states` | Query | :217 | canonical |
| | `organizations.cities` | Query | :221 | canonical |
| | `grants.savedList` | Query | :337 | ok |
| | `organizations.mapPoints` | Query | :449 | canonical |
| | **`catalog.count`** | Query | :508 | **ერთადერთი catalog.* remnant — fix in PR** |
| **EntityDetail.tsx** | **`catalog.detail`** | Query | :83 | **catalog.* dependent** |
| | `grants.savedList` | Query | :96 | ok |
| **OrganizationDetail.tsx** | `organizations.detail` | Query | :66 | canonical |
| **Dashboard.tsx** | `subscription.status` | Query | :41 | ok |
| | `grants.savedList` | Query | :46 | ok |
| | **`catalog.list`** | Query | :53 | **catalog.* dependent** |
| | **`catalog.count`** | Query | :58 | **catalog.* dependent** |
| | `onboarding.getProfile` | Query | :60 | ok |
| | `grants.toggleSave` | Mutation | :96 | ok |
| **Profile.tsx** | `subscription.status` | Query | :38 | ok |
| | `subscription.cancel` | Mutation | :43 | ok |
| **AiAssistant.tsx** | `ai.grantChat` | Mutation | :45 | ok |

### 2.3. Admin გვერდები

| გვერდი | endpoint | ტიპი | ფაილი:ხაზი | შენიშვნა |
|---|---|---|---|---|
| **Admin.tsx** | `admin.grants` | Query | :660, :857 | ორჯერ იძახება |
| | `admin.users` | Query | :850 | ok |
| | `admin.grantStats` | Query | :864 | ok |
| | `admin.newsletterStats` | Query | :865 | ok |
| | `admin.notificationHistory` | Query | :866 | ok |
| | `admin.searchExternal` | Query | :869 | GrantedAI proxy |
| | `admin.getExternalDetail` | Query | :873 | GrantedAI proxy |
| | `admin.importExternal` | Mutation | :877 | GrantedAI proxy |
| | `admin.updateRole` | Mutation | :892 | ok |
| | `admin.updateSubscription` | Mutation | :899 | ok |
| | `admin.createGrant` | Mutation | :906 | ok |
| | `admin.updateGrant` | Mutation | :915 | ok |
| | `admin.deleteGrant` | Mutation | :923 | soft-delete |
| | `admin.sendNewGrantNotification` | Mutation | :932 | ok |
| **Analytics.tsx** | — | — | — | გვერდი შემოწმება საჭიროა (გრეპმა არ დააგდო) |

---

## 3. კომპონენტები × endpoint მატრიცა

ხშირ-გამოყენებადი კომპონენტები რომლებიც tRPC-ს პირდაპირ იძახიან:

| კომპონენტი | endpoint | ტიპი | ფაილი:ხაზი | სად ფორმდება |
|---|---|---|---|---|
| **Navbar.tsx** | `subscription.status` | Query | :21 | გლობალური (ყველგან) |
| **MobileHeader.tsx** | `subscription.status` | Query | :23 | მობილურ top bar |
| **MobileBottomNav.tsx** | `onboarding.getProfile` | Query | :17 | bottom nav |
| **OnboardingModal.tsx** | `onboarding.complete` | Mutation | :18 | modal |
| **OnboardingFlow.tsx** | `onboarding.saveProfile` | Mutation | :43 | 3-step onboarding |
| **PricingCTA.tsx** | `subscription.activate` | Mutation | :30 | Paddle activation |
| **SmartSearchPanel.tsx** | `grants.savedList` | Query | :21 | sidebar |
| | `grants.toggleSave` | Mutation | :28 | sidebar |
| **GrantAiChat.tsx** | `ai.grantChat` | Mutation | :46 | chat widget |
| **OrgAiChat.tsx** | `ai.grantChat` | Mutation | :42 | org chat widget |
| **map/GrantDetailPanel.tsx** | `ai.grantChat` | Mutation | :409 | map popup |

---

## 4. Namespace × გვერდი heatmap

რამდენი გვერდი იძახებს რომელ namespace-ს (რაც მეტი — მეტი consolidation risk):

| Namespace | გვერდების count | კომპონენტების count | სტატუსი |
|---|---|---|---|
| **organizations** | 2 (Catalog, OrganizationDetail) | 0 | canonical, growing |
| **catalog** | 3 (Home, Dashboard, EntityDetail) + 1 остаток Catalog-ში | 0 | **deprecating** |
| **grants** | 3 (Catalog, Dashboard, EntityDetail) | 1 (SmartSearchPanel) | saved-list only, ok |
| **auth** | 5 (Login/Register/VerifyEmail/ForgotPwd/ResetPwd) | 0 | ok, stable |
| **subscription** | 3 (Profile, Dashboard, Catalog) | 3 (Navbar, MobileHeader, PricingCTA) | ok |
| **newsletter** | 1 (Home) | 0 | ok |
| **onboarding** | 1 (Dashboard) | 3 (MobileBottomNav, OnboardingModal, OnboardingFlow) | ok |
| **admin** | 1 (Admin.tsx) | 0 | ok, isolated |
| **ai** | 1 (AiAssistant) | 3 (GrantAiChat, OrgAiChat, map/GrantDetailPanel) | ok |
| **system** | 1 (Contact) | 0 | ok, single endpoint |

---

## 5. `catalog.*` ვრცელი ფართობი — ზუსტი scope-ი consolidation-ისთვის

ფაზა E-ში `catalog.*` namespace-ის სრული ცვლილება საჭიროებს **ზუსტად 4 ცვლილებას**:

### 5.1. Home.tsx (2 ცვლილება)

```diff
- const { data: previewData } = trpc.catalog.preview.useQuery(...)
- const { data: countData } = trpc.catalog.count.useQuery(...)
+ const { data: previewData } = trpc.organizations.list.useQuery({ limit: 6, ... })
+ const { data: countData } = trpc.organizations.count.useQuery(...)
```

**დამუშავება:** `catalog.preview` returned 6 latest grants. `organizations.list` უკვე მუშაობს სორტირებით და პაგინაციით — gap არ არის. `organizations.count` ჯერ არ არსებობს routers.ts-ში, უნდა დაემატოს (ფაზა E, PR #1).

### 5.2. Dashboard.tsx (2 ცვლილება)

```diff
- const { data: catalogData } = trpc.catalog.list.useQuery(...)
- const { data: countData } = trpc.catalog.count.useQuery(...)
+ const { data: catalogData } = trpc.organizations.list.useQuery(...)
+ const { data: countData } = trpc.organizations.count.useQuery(...)
```

**გამოწვევა:** Dashboard გადასცემს `profile`-ის filter-ებს (category, country, needs) ტრპც call-ში. `organizations.list` ფილტრები იგივეა? საჭიროა verification — DATA_MAP §3.2-ში ნათქვამია რომ organizations.list-ის input schema catalog.list-ის ზედდებული კოპიოა, ესე იგი drop-in უნდა იყოს. **შემოწმება აუცილებელია.**

### 5.3. EntityDetail.tsx (1 ცვლილება)

```diff
- const { data: detailData } = trpc.catalog.detail.useQuery({ id: slug })
+ const { data: detailData } = trpc.organizations.detail.useQuery({ orgId: slug })
```

**გამოწვევა:** ფაზა A-ს აღმოჩენა — `catalog.detail` returned denormalized grant row (with free-text `organization` string), `organizations.detail` returns structured org row + joined branches. EntityDetail.tsx-ის UI აწყობილია grant model-ზე. **ეს არის ერთადერთი non-trivial migration.**

გამოსავალი 2 ვარიანტი:
- **A:** EntityDetail გადაისწორო org view-ზე (დიდი UI ცვლილება).
- **B:** `catalog.detail` დატოვე backwards-compat, მხოლოდ შინაგანად ხელახლა დაწერე `organizations.detail`-ის გავლით (wrapper). დროებითი გამოსავალი, მერე რუცრელი ცვლილება.

რეკომენდაცია: B ახლავე, A მოგვიანებით (Phase E).

### 5.4. Catalog.tsx (1 ცვლილება, frozen!)

```diff
-  const { data: grantStatsData } = trpc.catalog.count.useQuery(...)
+  const { data: grantStatsData } = trpc.organizations.count.useQuery(...)
```

**CLAUDE.md freeze წესი:** Catalog.tsx-ის შეცვლას საჭიროებს მომხმარებლის ცალსახა ნებართვა. ერთი ხაზია, მაგრამ წესი წესია.

---

## 6. "ცარიელი" ფაილები / დაბნელებული endpoint-ები

გვერდები რომლებსაც ვერ დავაგდეო grep-ი და უნდა შემოწმდეს ხელით:

| გვერდი | სტატუსი | ქმედება |
|---|---|---|
| **Analytics.tsx** | 0 tRPC hooks-ი grep-ში | შემოწმება: იყენებს apiRequest-ს? ცარიელი placeholder-ია? |
| **NotFound.tsx** | 0 hooks (ცხადია) | ok |
| **Privacy/Terms/Refund.tsx** | 0 hooks | ok, სტატიკური |

---

## 7. Consolidation-ის risk-ის შეფასება

Phase E-სთვის:

| რისკი | ფრჩხილი | კომენტარი |
|---|---|---|
| Catalog.tsx breaks | 🟢 LOW | 1 ხაზი, drop-in, test-ი ხელით |
| Home.tsx breaks | 🟡 MEDIUM | preview scheme-ი გადასამოწმებელია |
| Dashboard.tsx breaks | 🟡 MEDIUM | filter pass-through ტესტი საჭიროა |
| EntityDetail.tsx breaks | 🔴 HIGH | UI schema იცვლება, ფრთხილი wrapper-ი (ვარ. B) რჩევა |
| Admin.tsx breaks | 🟢 LOW | namespace isolated, არ შეეხო |
| AI chat breaks | 🟢 LOW | ai.grantChat stable endpoint |
| Auth breaks | 🟢 LOW | auth.* stable |

---

## 8. Backwards-compat სტრატეგია (PR-ის რიგი)

CLAUDE.md golden rule-ის გათვალისწინებით (DB ცვლილებას წინ უყოფს კოდის ცვლილება):

**PR #1 — Phase E prep:** `organizations.count` + `organizations.preview` endpoint-ების დამატება routers.ts-ში. `catalog.*` უცვლელი რჩება. ცოცხალი ტრაფიკი — 0 ცვლილება.

**PR #2 — call-site migration:** Home + Dashboard + EntityDetail → `trpc.organizations.*`. Catalog.tsx-ისთვის მომხმარებელთან ცალკე კონსერნი. `catalog.*` endpoint-ები **ჯერ კიდევ დარჩება** routers.ts-ში (dead code, მომდევნო PR-ში ჩაიდოს).

**PR #3 — catalog.* removal:** `catalog.*` namespace-ის ამოღება routers.ts-დან, db.ts-დან duplicate helpers-ის წაშლა. Tests + type checks.

ეს სამი PR-იანი სტრატეგია FRONTEND_MAP-ს ახლავე აქცევს executable roadmap-ად Phase E-სთვის.

---

## 9. შემდეგი ნაბიჯი — Phase D

Phase C დასრულდა. Phase D ანალიზდება: scripts, CRON/GitHub Actions, external APIs, MCP servers, `.env` dependencies.

ფაზა D გაანალიზებს:
1. `scripts/` საქაღალდე (enrich-*, import-*, discovery, translate, seed-*, migrate-to-supabase)
2. `.github/workflows/` (daily-discovery.yml)
3. `.mcp.json` (grantkit-db, gitnexus)
4. `server/externalGrants.ts` (GrantedAI API)
5. `server/emailService.ts` (Resend)
6. `server/toolboxClient.ts` (AI chat DB client)
7. `package.json` scripts block

შედეგი → `.grantkit-redesign/INFRASTRUCTURE_MAP.md`.

---

*Generated by Hana — Phase C complete, 2026-04-23.*
