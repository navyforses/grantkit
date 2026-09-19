# DATA_MAP — tRPC endpoints → ცხრილები → UI

**თარიღი:** 2026-04-23
**წყარო:** `server/routers.ts` (1524 ხაზი), `server/db.ts`, `client/src/pages/*.tsx`
**ფოკუსი:** რომელი endpoint რომელ ცხრილს კითხულობს/წერს, რომელი გვერდი რომელ endpoint-ს იძახებს, და სად დუბლირდება ლოგიკა catalog ↔ organizations namespace-ებში.

---

## 1. Router tree — გაზოგადებული სტრუქტურა

```
appRouter
├─ system          (system router — health etc)
├─ auth            (6 procedures — login/logout/register/verify/forgot/reset)
├─ subscription    (3 procedures — status/cancel/activate)
├─ grants          (2 procedures — savedList/toggleSave)
├─ catalog         (10 procedures — grants-ის სამყარო)
├─ newsletter      (2 procedures — subscribe/unsubscribe)
├─ profile         (4 procedures — onboarding/save/get/update)
├─ admin           (23 procedures — CRUD + imports + external API)
├─ ai              (1 procedure — grantChat)
└─ organizations   (10 procedures — orgs-ის სამყარო)    ← MIRROR of catalog
```

**57 endpoint სულ.** აქედან `catalog` და `organizations` თითქმის 1:1 mirror-ებია (იხ. §4).

---

## 2. Endpoint → ცხრილი მატრიცა

ლეგენდა: R = Read, W = Write, T = Translations

| Namespace | Endpoint | `grants` | `grant_translations` | `organizations` | `organization_branches` | `organization_translations` | `users` | `saved_grants` | `newsletter_subs` | `notification_history` |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| auth | login/register/... | | | | | | RW | | | |
| subscription | status/cancel/activate | | | | | | RW | | | |
| grants | savedList | | | | | | | R | | |
| grants | toggleSave | | | | | | | RW | | |
| **catalog** | list | R | R (T) | | | | | | | |
| **catalog** | detail | R | R (T) | | | | | | | |
| **catalog** | count | R | | | | | | | | |
| **catalog** | preview | R | R (T) | | | | | | | |
| **catalog** | states/countries/cities/regions | R | | | | | | | | |
| **catalog** | categoryCounts | R | | | | | | | | |
| **catalog** | smartSearch | R | | | | | | | | |
| newsletter | subscribe | | | | | | | | W | |
| newsletter | unsubscribe | | | | | | | | W | |
| profile | complete/save/get/update | | | | | | RW | | | |
| admin | stats/grantStats | R | | | | | R | | R | |
| admin | newsletterStats | | | | | | | | R | |
| admin | notificationHistory | | | | | | | | | R |
| admin | exportGrants | R | R | | | | | | | |
| admin | sendNewGrantNotification | | | | | | | | R | W |
| admin | users / updateRole / updateSubscription | | | | | | RW | | | |
| admin | grants / grantDetail | R | R | | | | | | | |
| admin | createGrant/updateGrant/updateGrantTranslations/deleteGrant/hardDeleteGrant | RW | RW | | | | | | | |
| admin | parseImport / executeImport | W | W | | | | | | | |
| admin | searchExternal / getExternalDetail / importExternal / searchFunders | W | W | | | | | | | |
| ai | grantChat | R | R | | | | | | | |
| **organizations** | list | | | R | | | | | | |
| **organizations** | detail | | | R | R | | | | | |
| **organizations** | count | | | R | | | | | | |
| **organizations** | mapPoints | | | R | R | | | | | |
| **organizations** | states/countries/cities/regions | | | R | | | | | | |
| **organizations** | categoryCounts | | | R | | | | | | |
| **organizations** | smartSearch | | | R | | | | | | |

**ძირითადი დასკვნები:**

1. **`organization_translations` ცხრილი — 0 endpoint.** არცერთი tRPC procedure არ ეხება მას. ამიტომაა 0 რიგი. წაშლა უსაფრთხოა (თუ მომავალში არ უნდა ვიყენებდეთ org თარგმანებს).
2. **`catalog` ⊂ endpoints კითხულობს 9 duplicate ველს** grants-იდან (`address`, `latitude`, `longitude`, `serviceArea`, `officeHours`, `phone`, `email`, `website`, `state`/`city`) — მიაქვს ეს ველები UI-ში.
3. **`organizations.detail` უკვე ჯოინებს branches-ს** (ხედავს canonical geo). ანუ UI-ს მყარი წყარო გვაქვს.
4. **cross-pollination 0:** არც ერთი endpoint არ კითხულობს **ორივე** `grants` + `organizations` ერთდროულად. მათ შორის ხიდი არსად არ არსებობს tRPC layer-ზე. UI-ში თუ გვინდა "ამ ორგანიზაციის გრანტები", ახალი endpoint უნდა გავაკეთოთ.

---

## 3. duplicate work — `catalog` ≈ `organizations`

| მიზანი | `catalog.*` | `organizations.*` |
|---|---|---|
| ფილტრირებული ლისტი | `list` | `list` |
| ცალობრივი ჩანაწერი | `detail` | `detail` |
| ჯამი | `count` | `count` |
| რუკის მარკერები | (ფოტოს გულაოდ `list.grants[].latitude`) | `mapPoints` |
| state/country/city dropdown | `states`/`countries`/`cities` | `states`/`countries`/`cities` |
| რეგიონული bucket-ები | `regions` | `regions` |
| კატეგორიის counter | `categoryCounts` | `categoryCounts` |
| AI ძებნა | `smartSearch` | `smartSearch` |
| **ჯამი** | **9 endpoint** | **9 endpoint** |

**კოდის 99% იდენტურია.** `server/db.ts`-ში ცალცალკე ფუნქციები:
- `listGrants` ↔ `listOrganizations`
- `getDistinctStates` ↔ `getOrgDistinctStates`
- `getCategoryCounts` ↔ `getOrgCategoryCounts`
- `searchGrantsMultiTerm` ↔ `searchOrganizationsMultiTerm`
- `expandQuery` (shared — good)

**consolidation-ის შემდეგ** ამ 18 endpoint-ის ნახევარი ქრება. ერთი `organizations.*` namespace რჩება; `organizations.detail` აბრუნებს `programs[]`-ს, და `organizations.list` ცვლის catalog-ის როლს.

---

## 4. catalog.list vs organizations.list — რომელია რეალურად ნახმარი?

Quick check საჭიროა (Phase C):

| გვერდი | catalog.* ეძახის? | organizations.* ეძახის? |
|---|:-:|:-:|
| `Home.tsx` | ? | ? |
| `Catalog.tsx` | ? | ? |
| `GrantDetail.tsx` | ? | ? |
| `Dashboard.tsx` | ? | ? |
| `OrganizationDetail.tsx`? | ? | ? |

**ფაიც-ჩეკი Phase C-ში.**

---

## 5. ბოროტი ველების ინვენტარი (რა რომ წაშალო, UI არ გატყდება?)

**დეფინიცია:** "ბოროტი" ველი ის არის, რომელსაც რუკის UI-ს ხვდება `organization_branches`-დან, მაგრამ endpoint-ები აბრუნებენ `grants.*`-დან.

| ველი grants-ში | catalog endpoint აბრუნებს? | UI კითხულობს? | რისკის დონე |
|---|:-:|:-:|---|
| `latitude`/`longitude` | ✅ list/detail/preview | ? | LOW — branch-ი master-ია |
| `address` | ✅ list/detail/preview | ? | LOW |
| `phone` | ✅ list/detail/preview | ? | MED (contact on grant page?) |
| `email` (→ grantEmail) | ✅ list/detail/preview | ? | MED |
| `website` | ✅ list/detail/preview | ? | HIGH — grant-ის ოფიციალური ვებსაიტია |
| `serviceArea` | ✅ list/detail/preview | ? | LOW |
| `officeHours` | ✅ list/detail/preview | ? | LOW |
| `state`/`city` | ✅ list/detail/preview | ? | LOW |

**დაზუსტებაა Phase C-ში.** საჭიროა `grep "\.website"`, `\.phone"`, `\.email"` etc. `client/src/` ფოლდერში ოფციურად.

---

## 6. admin namespace — 23 endpoint-ის კორპუსი

ადმინის panel-ი სრულად grants-ზე ორიენტირებულია. 0 endpoint ორგანიზაციებისთვის (🔴 missing):

**არსებული (grants):**
- `admin.grants` — paginated list for admin table
- `admin.grantDetail` — single grant
- `admin.createGrant` / `updateGrant` / `updateGrantTranslations` / `deleteGrant` / `hardDeleteGrant`
- `admin.parseImport` / `executeImport` — CSV/Excel bulk import
- `admin.searchExternal` / `getExternalDetail` / `importExternal` / `searchFunders` — GrantedAI external API

**არ არსებობს (orgs):**
- `admin.organizations` (list for admin)
- `admin.organizationDetail`
- `admin.createOrganization` / `updateOrganization` / `deleteOrganization`
- `admin.manageBranches`
- `admin.organizationTranslations`

**შედეგი:** ორგანიზაციების management ხელით ხდება SQL-ით ან enrichment scripts-ებით. Phase E-ში ადმინ panel-ის rework ჩაჯდა.

---

## 7. AI path (`ai.grantChat`)

ერთადერთი AI endpoint. `grantAssistant.ts`-ში ახდენს direct Drizzle query-ებს, Anthropic API-ს იძახებს. grants-ს კითხულობს, გრანტების თარგმნულ ვერსიას მომხმარებელს აწვდის. **არცერთი org table-ი.** consolidation-ისას ამ endpoint-ს orgs ცნობა მოუწევს.

---

## 8. External API dependencies

- **GrantedAI** (`externalGrants.ts`) — admin-ი იყენებს `searchExternal` / `importExternal` / `searchFunders`. API ბოლოდ გრანტებს აბრუნებს, ორგანიზაციებს მხოლოდ `searchFunders`-ის შემთხვევაში. consolidation-ის შემდეგ `importExternal` უნდა იყოფოდეს ორად: `importOrganization` + `importProgram`.
- **Anthropic** (`grantAssistant.ts`, `queryExpander.ts`) — AI ქართულ/ფრანგულ/რუსულ მოთხოვნებს აფართოებს ინგლისურ terms-ებად.
- **Paddle** (webhooks, subscription.* endpoint-ებში embedded) — payment integration.
- **Resend** (`emailService.ts`) — email notifications.
- **Google Maps JS API** (frontend only) — რუკა.
- **Google Places API** (batch enrichment scripts, ad-hoc) — org-ების geo lookup.

---

## 9. რა ცხრილს რომ სამდე წაშალო, ვინ გატყდება?

| ცხრილი | tRPC endpoints რომ ეხება | UI-ს ეფექტი |
|---|---|---|
| `organization_translations` | **0** | 0. უსაფრთხოდ წასაშლელი. |
| `saved_grants` | 2 (`grants.savedList`, `grants.toggleSave`) | auth user-ების bookmark feature გატყდება. 0 რიგი, 0 მომხმარებელი → 0 regression. |
| `newsletter_subscribers` | 4 (`newsletter.*` + admin stats + sendNewGrantNotification) | newsletter feature გატყდება. 0 რიგი → 0 რეგრესია, მაგრამ feature is UI-ში ჯერ კიდევ ჩანს. |
| `notification_history` | 2 (`admin.notificationHistory`, `admin.sendNewGrantNotification`) | admin-ის campaign log. 0 რიგი. |
| `users` | ~10 endpoints (ყველა auth + subscription + profile + admin.users) | login/auth სრულად გატყდება. **არ წაშალო.** |

**რეკომენდაცია Phase E-ში:** `organization_translations` წაშლა OK. `saved_grants` / `newsletter` / `notification` — freeze as-is (არცერთი user-ი არ იყენებს, feature დამატებას მომავალში ვერ უცვლის).

---

## 10. შემდეგი ნაბიჯი — Phase C

პლანი:
1. `Grep` `client/src/pages/` საქაღალდეში ყველა `trpc\.(catalog|organizations|grants|admin|ai)\.[a-zA-Z]+\.use` სამოდელი.
2. გვერდი-გვერდი ცხრილი აშენდება: რა endpoint-ს იძახებს.
3. გვერდები რომლებიც duplicate catalog/org endpoint-ებს იძახიან → candidates for consolidation.
4. ენდრი (orphan) გვერდები — რომელს არავინ ხედავს?
5. freeze list: Catalog.tsx (CLAUDE.md წესით) — ცალკე tag.

შედეგი → `.grantkit-redesign/FRONTEND_MAP.md`.
