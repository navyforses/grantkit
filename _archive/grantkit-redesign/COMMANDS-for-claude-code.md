# Claude Code-ისთვის ბრძანებები — ყველა ეტაპი

> ყოველი ბრძანება ცალკე copy-paste block-ია. ჩასვი Claude Code-ის chat-ში თანმიმდევრობით.
> ყოველი ბრძანება 2 ნაწილია: (1) Claude Code ჯერ აგიხსნის რას აპირებს, (2) დაგელოდება „კი, გააკეთე".
>
> **არასოდეს გადახტე ეტაპები.** თუ ვერ გაიგე რას ამბობს — დაუსვი კითხვები ვიდრე „კი, გააკეთე".

---

## 🟢 ეტაპი 1 — Branches Cleanup

**მიზანი:** გავიგოთ რა არის ცოცხალი ცვლილება main-ის გარეთ + გავაერთიანოთ ან მიატოვოთ.

### ბრძანება 1.1 — Branches ანალიზი (Claude Code მხოლოდ ანალიზობს)

```
წაიკითხე .grantkit-redesign/MASTER-ROADMAP-2026-04-25.md მთლიანად.

ახლა გავაკეთოთ ეტაპი 1 — branches cleanup ანალიზი.

ნაწილი 1 — ჯერ ამიხსენი მკაფიოდ:
1. რომელ branch-ზე ვართ ახლა (git branch --show-current)
2. branch `claude/contact-enrichment-schema` რას შემოიტანს main-ში
   თუ მერჯდება (git diff main..claude/contact-enrichment-schema --stat)
3. branch `feat/catalog-organizations-data-source` რას შემოიტანს
   main-ში (git diff main..feat/catalog-organizations-data-source --stat)
4. რომელი ცვლილებები გადადება ერთმანეთს, რომელი ცალკე-ცალკეა
5. რა რისკი არის თითოეული merge-ისას (CI გაიშვება? tsc errors?)
6. შენი რეკომენდაცია — რომელი უნდა შემერჯდეს, რომელი მიტოვდეს, რატომ

ნაწილი 2 — დაელოდე ჩემს პასუხს:
არაფერი არ შეცვალო. არ გააკეთო git checkout, git merge, არ წაშალო branch.
მხოლოდ გაანალიზე ცვლილებები და მითხარი მკაფიოდ.
როცა გავიგებ ანალიზს, მე გადავწყვეტ რა მოხდება.
```

### ბრძანება 1.2 — Branches merge/cleanup (Claude Code ცვლის)

> გამოიყენე მხოლოდ ბრძანება 1.1-ის ანალიზის შემდეგ.

```
ეტაპი 1.1-ის ანალიზის საფუძველზე გადავწყვიტე:
[აქ შეცვალე — მაგ: "შემერჯე claude/contact-enrichment-schema main-ში,
წავშალო feat/catalog-organizations-data-source"]

ნაწილი 1 — ჯერ ამიხსენი:
1. ზუსტად რა ბრძანებებს გაუშვებ (git checkout, merge, delete)
2. რა commits წავა main-ში merge-ის შემდეგ
3. CLAUDE.md-ის "Migration golden rule" — დაცული იქნება?
   (DB migration ჯერ Railway-ზე, მერე merge)
4. CI/tsc რა გაიშვება და რა ხდება თუ ხარვეზი დაიჭირა
5. რა მოხდება main-ის სტატუსთან ამ ცვლილების შემდეგ
   (რამდენი commit ahead, რამდენი ფაილი მოდიფიცირებულია)

ნაწილი 2 — დაელოდე ჩემს დადასტურებას:
არც git checkout, არც merge, არც delete სანამ არ მოგწერო "კი, გააკეთე".
თუ რაიმე გაუგებარია — მკითხე ჯერ.
```

---

## 🟡 ეტაპი 2 — Phase 2 დასრულება (PR#3, #4, #5)

**მიზანი:** EXECUTION-PLAN.md-ის Wave 1 დასრულდეს — schema სუფთა.

### ბრძანება 2.1 — PR#3 (აგრესიული — orphans, NOT NULL, DROP)

```
წაიკითხე .grantkit-redesign/EXECUTION-PLAN.md, კონკრეტულად PR#3 ნაწილი.

გავაკეთოთ ეტაპი 2.1 — Phase 2 PR#3-ის ფაილების მომზადება.

ნაწილი 1 — ჯერ ამიხსენი:
1. PR#3-ის 4 step რას ცვლის: (a) orphan→orgs, (b) NOT NULL,
   (c) drop dup columns, (d) drop organization_translations
2. რომელი ფაილები შექმნი:
   - drizzle/0018_phase2_pr3_*.sql (migration)
   - scripts/apply-migration-0018.mjs
   - scripts/convert-orphan-grants-to-orgs.mjs
3. drizzle/schema.ts-ში რა ცვლილება მოხდება (რომელი სვეტები წავა,
   რომელი ცხრილი წაიშლება)
4. რა რისკია — 102 orphan grant ხდება ორგანიზაცია (auto ID ORG-9001+),
   558 dup lat/lng/address წაშლა
5. Rollback გეგმა — როგორ ვიქცევით თუ Railway-ზე გატყდა
6. CLAUDE.md golden rule დაცულია? (Railway-ზე ჯერ apply, მერე merge)

ნაწილი 2 — დაელოდე ჩემს დადასტურებას:
არაფერი არ შექმნა და არ შეცვალო. მხოლოდ ჯერ გეგმა მითხარი.
"კი, შექმენი ფაილები" სანამ არ მოგწერო, არაფერი არ შეიცვალოს.
```

### ბრძანება 2.2 — PR#4 (RENAME grants → programs)

> გამოიყენე მხოლოდ PR#3-ის Railway-ზე გაშვების შემდეგ.

```
წაიკითხე .grantkit-redesign/EXECUTION-PLAN.md PR#4 ნაწილი.

გავაკეთოთ ეტაპი 2.3 — Phase 2 PR#4 (RENAME grants → programs).

ნაწილი 1 — ჯერ ამიხსენი:
1. რა SQL ცვლილება მოხდება (RENAME table, RENAME column)
2. backward-compat VIEW რა მიზნისაა (ვიდრე PR#5 არ გაიშვება)
3. რომელი ფაილები შექმნი (migration 0019, apply script)
4. drizzle/schema.ts-ში რა გადარქმევა მოხდება
5. tRPC endpoint-ები (catalog.*) რა მოუვა — ისევ მუშაობს?
6. რა ფაილები არ უნდა შეცვალო (Catalog.tsx frozen)
7. Rollback გეგმა

ნაწილი 2 — დაელოდე ჩემს დადასტურებას:
"კი, შექმენი ფაილები" სანამ არ მოგწერო, არ ცვალო schema.ts ან migration.
```

### ბრძანება 2.3 — PR#5 (DELETE catalog.* namespace)

> გამოიყენე მხოლოდ PR#4-ის Railway-ზე გაშვების შემდეგ.

```
წაიკითხე .grantkit-redesign/EXECUTION-PLAN.md PR#5 ნაწილი.

გავაკეთოთ ეტაპი 2.4 — Phase 2 PR#5 (DELETE catalog.* + rewire).

ნაწილი 1 — ჯერ ამიხსენი:
1. server/routers.ts-ში რომელი 9 endpoint წაიშლება
2. რომელ frontend ფაილებში უნდა გადარქმევა catalog.* → organizations.*
   (Home.tsx, Dashboard.tsx, EntityDetail.tsx)
3. Catalog.tsx ხაზი 508-ის გადარქმევა (frozen exemption)
4. PR#4-ის backward-compat VIEW წაიშლება?
5. რა testing საჭიროა (smoke test რომელ გვერდებზე)
6. რა რისკი არის — frontend-ი გატყდება?

ნაწილი 2 — დაელოდე ჩემს დადასტურებას:
"კი, დაიწყე rewire" სანამ არ მოგწერო, ფაილებს არ შეეხო.
```

---

## 🔵 ეტაპი 3 — Contact Enrichment Phase B (Background)

**მიზანი:** 538 ორგანიზაციას მივცეთ ნამდვილი phone/email Google Places-ით.

### ბრძანება 3.1 — Scraper script წერა

```
წაიკითხე .grantkit-redesign/PROJECT_MAP.md "Contact enrichment Phase B"
ნაწილი + .grantkit-redesign/STATE.md-ში anti-hallucination წესები.

გავაკეთოთ ეტაპი 3.1 — Contact Enrichment Phase B scraper.

ნაწილი 1 — ჯერ ამიხსენი:
1. სკრიპტი scripts/enrich-org-contacts.ts (უკვე არსებობს?
   თუ კი, რა აკეთებს, რა აკლია)
2. Google Places API გამოყენება (rate limit 50/დღე)
3. Anti-hallucination წესი: phone/email უნდა იყოს HTML-ის
   substring-ი, არა LLM-ის გენერაცია
4. რომელი 7 provenance სვეტი იწერება (phoneSource, phoneVerifiedAt
   და ა.შ.)
5. CLI flags (--batch=2026-04-25-001, --dry-run, --limit=50)
6. Output: რამდენი enriched, რამდენი no_data, რამდენი failed

ნაწილი 2 — დაელოდე ჩემს დადასტურებას:
არ შექმნა ან შეცვალო script. ჯერ მითხარი რა იქნება.
"კი, დაწერე" სანამ არ მოგწერო, არ დაიწყო.
```

---

## 🟣 ეტაპი 4 — France Import (ჩვენი მიზანი)

**მიზანი:** 624 ფრანგული ორგ + 102 housing card + i18n.

### ბრძანება 4.1 — HANDOFF გადაწერა (Cowork-ი — მე ვაკეთებ)

> ეს ჩემთვისაა (Cowork). შენ არაფერი არ უნდა გააკეთო. მე გადავწერ HANDOFF-ი
> Phase 2-ის შემდგომი schema-სთვის (programs, არა grants; org_translations
> წაშლილია). უბრალოდ მითხარი „დაიწყე ეტაპი 4.1".

### ბრძანება 4.2 — Migration 0021 + import script

> გამოიყენე მხოლოდ ეტაპი 4.1-ის შემდეგ.

```
წაიკითხე .grantkit-redesign/HANDOFF-claude-code-wave1.md
(განახლებული Cowork-ის მიერ).

გავაკეთოთ ეტაპი 4.2 — France Import schema + script.

ნაწილი 1 — ჯერ ამიხსენი:
1. Migration 0021-ში რა სვეტი დაემატება organizations-ს
   (abbreviation, organizationType, foundedYear...)
2. organization_housing ცხრილი (102 row) რა სვეტი ექნება
3. თარგმანის სტრატეგია — JSON სვეტი თუ ცალკე ცხრილი
   (Phase 2-ის PR#3 წაშალა old organization_translations)
4. scripts/import-france-orgs.ts რა pipeline-ს იყენებს
   (parse → dedup → cost mapping → translation gap → housing)
5. de-dup logic — NEW Excel ცვლის OLD-ს (შაკოს გადაწყვეტა)
6. cost mapping — 30+ ფრაზა → 6 enum (ცხრილი HANDOFF-ში)
7. რა CLI flags იქნება (--dry-run, --apply, --notify)

ნაწილი 2 — დაელოდე ჩემს დადასტურებას:
არ შექმნა migration ფაილი, არ შეცვალო schema.ts.
"კი, შექმენი ფაილები" სანამ არ მოგწერო.
```

### ბრძანება 4.3 — Migration apply + dry-run (Cowork — მე ვაკეთებ)

> ჩემთვისაა. შენ მითხარი „დაიწყე ეტაპი 4.3" და მე ვუშვებ Railway-ზე
> migration-ს, მერე dry-run-ს, შემდეგ შენ რეპორტს გაჩვენებ.

### ბრძანება 4.4 — UI კომპონენტები + i18n

> გამოიყენე ეტაპი 4.3-ის შემდეგ (DB-ში France-ის მონაცემები ცოცხალი).

```
წაიკითხე .grantkit-redesign/PLAN-france-orgs-import.md §5 (UI ცვლილებები).

გავაკეთოთ ეტაპი 4.4 — France UI კომპონენტები.

ნაწილი 1 — ჯერ ამიხსენი:
1. რომელი ახალი React კომპონენტი შექმნი:
   - HousingCard.tsx (housing type, capacity, max stay,
     yellow "Why this matters" banner)
   - ServicesOfferedCard.tsx
   - TargetAudienceCard.tsx
   - new badges (foundedYear, organizationType, isNational)
2. OrganizationDetail.tsx-ში სად დაემატება (left/right column)
3. რომელი i18n keys 5 ენაში დაემატება
   (organizations.detail.foundedYear, housing.type.shelter, ...)
4. რა Tailwind classes/colors გამოყენდება
5. tRPC organizations.detail extend (housing payload return)
6. Catalog.tsx არ შეცვალო (frozen)
7. რა testing საჭიროა (5 random France ორგ-ზე smoke test)

ნაწილი 2 — დაელოდე ჩემს დადასტურებას:
არ შექმნა კომპონენტი, არ შეცვალო i18n ფაილი.
"კი, დაიწყე UI" სანამ არ მოგწერო.
```

### ბრძანება 4.5 — AI თარგმანის pipeline (Cowork — მე ვაკეთებ)

> ჩემთვისაა. შენ მითხარი „დაიწყე ეტაპი 4.5".

### ბრძანება 4.6 — QA + PROJECT_MAP update (Cowork + შენ)

> ჩემთვისაა + შენი UAT. მითხარი „დაიწყე ეტაპი 4.6".

---

## 📋 თანმიმდევრობა — ერთ შეხედვით

| # | ეტაპი | ვინ აკეთებს | ბრძანება |
|---|---|---|---|
| 1.1 | Branches ანალიზი | Claude Code | ☑ |
| 1.2 | Branches merge | Claude Code | ☑ |
| 2.1 | PR#3 ფაილები | Claude Code | ☑ |
| 2.2 | PR#3 Railway-ზე | მე | "დაიწყე ეტაპი 2.2" |
| 2.3 | PR#4 ფაილები | Claude Code | ☑ |
| 2.4 | PR#4 Railway-ზე | მე | "დაიწყე ეტაპი 2.4" |
| 2.5 | PR#5 rewire | Claude Code | ☑ |
| 2.6 | PR#5 deploy | მე | "დაიწყე ეტაპი 2.6" |
| 3.1 | Scraper script | Claude Code | ☑ |
| 3.2 | Scraper run | მე (background) | "დაიწყე ეტაპი 3.2" |
| 4.1 | HANDOFF გადაწერა | მე | "დაიწყე ეტაპი 4.1" |
| 4.2 | France migration + script | Claude Code | ☑ |
| 4.3 | France import Railway-ზე | მე | "დაიწყე ეტაპი 4.3" |
| 4.4 | France UI | Claude Code | ☑ |
| 4.5 | AI თარგმანი | მე | "დაიწყე ეტაპი 4.5" |
| 4.6 | ფინალი + docs | მე + შენ | "დაიწყე ეტაპი 4.6" |

---

## 🛡 უსაფრთხოების წესი

ყოველი ბრძანება Claude Code-ისთვის გამოიგზავნოს ცალცალკე. **არ გაუშვა ერთდროულად რამდენიმე**. თუ ერთი ეტაპი დაასრულდა → ნახე რეზულტატი → მერე მომდევნო ბრძანება.

თუ რამე უცნაური მოხდა (errors, კონფლიქტი) — დააჩერე და მომწერე Cowork-ში.
