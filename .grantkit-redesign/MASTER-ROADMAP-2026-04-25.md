# Master Roadmap — ცოცხალი სამუშაოების სია + თანმიმდევრობა

> **შექმნილია:** 2026-04-25 | **წყარო:** git log + branches + EXECUTION-PLAN.md + PROJECT_MAP.md

## ყველაზე მნიშვნელოვანი მითის გაფანტვა

**„Tamar", „Ezra", „Noa", „Kwame" — არ არსებობენ ნამდვილი ადამიანებად.**

შენს `TEAM_ROSTER.md`-ში ეს არის **persona** (სცენარული სახელები) Claude Code-ის სხვადასხვა სესიებისთვის. git history-ში რეალური commit-ები მხოლოდ შენი (jincharadzeshako, navyforses, shako) და Claude-ის (ავტომატური) ხელშია.

**ანუ ყველა „პარალელური" სამუშაო — შენი წინა Claude Code სესიების ნამუშევარია, რომელიც ჯერ არ დასრულებულა.** არავის ელოდება — შენ გადაწყვეტ რა იმუშავებს და რა დარჩება.

---

## 🔴 5 ცოცხალი სამუშაო, რომელიც ჯერ არ დასრულდა

### A. `claude/contact-enrichment-schema` branch (აქ ვართ ახლა) ⏳
**24,029 ხაზი, 77 ფაილი, main-ში არ შერეულა**
შენ მაგზე ხარ ახლა. შეიცავს:
- Wave 1 helper scripts (backfill-grants-orgid, enrich-org-contacts)
- Daily discovery imports (2026-04-21/22/23)
- Migration 0017 apply script
- Restoration commits (af283e1, 0d39ab4) — წაშლილი ფაილების უკან დაბრუნება

**პრობლემა:** ძალიან დიდი branch — main-ში მერჯვა საშიშია, რადგან რამდენიმე ცვლილება არასწორად გადაიჭრა.

### B. `feat/catalog-organizations-data-source` branch ⏳
**1,778 ხაზი, 20 ფაილი, main-ში არ შერეულა**
- Catalog.tsx-ი მონაცემთა წყაროდ organizations-ს იყენებს grants-ის მაგივრად
- OrganizationDetail.tsx + OrgAiChat (490 ხაზი)
- Migration 0014 (widen country)
- Verify scripts

### C. Phase 2 / Wave 1 — დარჩენილი 3 PR (EXECUTION-PLAN.md)
✅ PR#1 shipped (orgId column added)
✅ PR#2 shipped (97.1% backfill)
❌ **PR#3** — NOT NULL + drop dup columns + drop `organization_translations` (აგრესიული)
❌ **PR#4** — RENAME `grants` → `programs`
❌ **PR#5** — DELETE `catalog.*` namespace

### D. Contact Enrichment Phase B (PROJECT_MAP.md-ის "current phase")
✅ Schema shipped (PR #153, #155)
❌ Scraper script ჯერ არ შექმნილა — Google Places + website regex-ით

### E. France Import — **ჩვენი ახალი სამუშაო** 🆕
624 ფრანგული ორგანიზაცია, 102 housing card, AI ავტო-თარგმანი
Migration 0021+ (0017–0020 დაცული)

---

## 📋 რეკომენდებული თანმიმდევრობა (უსაფრთხო პირველი)

### ეტაპი 1 — გავწმინდოთ ცოცხალი ნაკადი (1 დღე)

**მიზანი:** main-ი სუფთა იყოს ვიდრე ახალს ვიწყებთ.

| ნაბიჯი | რა | ვინ | დრო |
|---|---|---|---|
| 1.1 | A branch-ი მერჯე main-ში ან მიატოვე | Claude Code IDE-ში | 1 სთ |
| 1.2 | B branch-ი მერჯე ან მიატოვე (UI ცვლილებები) | Claude Code IDE-ში | 1 სთ |
| 1.3 | git status სრულად სუფთა | მე ვამოწმებ | 5 წთ |

🚨 **გადაწყვეტა საჭირო:** A და B branches რომლებიც კარგია? რომელი შეიძლება მიატოვო?

---

### ეტაპი 2 — Phase 2-ის დასრულება (3-4 დღე)

**მიზანი:** EXECUTION-PLAN.md-ის Wave 1 დასასრულამდე.

| ნაბიჯი | რა | ვინ | დრო |
|---|---|---|---|
| 2.1 | PR#3 — orphan grants → orgs, NOT NULL, DROP columns, DROP `organization_translations` | Claude Code | 6 სთ |
| 2.2 | მე ვუშვებ Migration Railway-ზე | მე | 10 წთ |
| 2.3 | PR#4 — RENAME grants → programs | Claude Code | 4 სთ |
| 2.4 | PR#5 — DELETE catalog.* namespace + rewire | Claude Code | 4 სთ |
| 2.5 | Production smoke test | შენ + მე | 30 წთ |

⚠️ **PR#3 აგრესიულია** — წაშლის ცხრილს `organization_translations`. ეს ცხრილი ჯერ ცარიელია (არ არის რა დაიკარგოს), ამიტომ უპრობლემოა.

---

### ეტაპი 3 — Contact Enrichment Phase B (1-2 დღე)

**მიზანი:** 538 ორგანიზაციას მივცეთ ნამდვილი phone/email Google Places-ით.

| ნაბიჯი | რა | ვინ | დრო |
|---|---|---|---|
| 3.1 | scraper script წერა | Claude Code | 4 სთ |
| 3.2 | 50 ორგ/დღე batch run | მე (cron) | ~2 კვირა background |
| 3.3 | Verification + report | მე | 30 წთ |

**ამ ეტაპის პარალელურად დაიწყე ეტაპი 4** — Contact Enrichment ცალკე background-ი გადის.

---

### ეტაპი 4 — 🆕 France Import (ჩვენი) (2-3 დღე)

**მიზანი:** 624 ფრანგული ორგ. + 102 housing + i18n + UI.

**Schema პოსტ-Phase 2:** ცხრილები გადარქმეული იქნება (`programs`, არა `grants`), `organization_translations` წაშლილი. ჩვენ თარგმანებს სხვა ფორმით უნდა დავუმატოთ:

ვარიანტი 1 (recommended): JSON სვეტი `organizations.translations` ცხრილში — `{en: {...}, fr: {...}}`
ვარიანტი 2: ხელახლა შევქმნათ `organization_translations`, დაცვით PR#3-ის DROP-ის შემდეგ

| ნაბიჯი | რა | ვინ | დრო |
|---|---|---|---|
| 4.1 | HANDOFF გადაწერა (migration 0021, post-Phase 2 schema) | მე | 30 წთ |
| 4.2 | Migration 0021 + import script | Claude Code | 4 სთ |
| 4.3 | მე გავუშვებ Railway-ზე + dry-run + production import | მე | 1 სთ |
| 4.4 | UI კომპონენტები (HousingCard, badges) + i18n 5 ენაში | Claude Code | 4 სთ |
| 4.5 | AI ავტო-თარგმანი ცარიელ ცელებზე | მე | 1 სთ |
| 4.6 | QA + PROJECT_MAP.md update | მე + შენ | 30 წთ |

---

## 📅 Gantt-ის სტილით კალენდარი

```
დღე 1: [ეტაპი 1: branches cleanup] ████░░░░░░░░░░░░░░░░░
დღე 2: [Phase 2: PR#3 ship]        ░░░░████░░░░░░░░░░░░░
დღე 3: [Phase 2: PR#4 + PR#5]      ░░░░░░░░████░░░░░░░░░
დღე 4: [Phase 2 wrap + smoke]      ░░░░░░░░░░░░██░░░░░░░
დღე 5: [Contact Enrich script]     ░░░░░░░░░░░░░░██░░░░░
დღე 5–6: [France Wave starts]      ░░░░░░░░░░░░░░░░██░░░  ← background contact enrichment-ი ცალკე
დღე 6: [France import]             ░░░░░░░░░░░░░░░░░░██░
დღე 7: [France UI + ფინალი]        ░░░░░░░░░░░░░░░░░░░██
```

**ჯამი: ~7 დღე active work + 2 კვირა background contact enrichment.**

---

## 🚦 ახლა შენი 3 გადაწყვეტილება

### გადაწყვეტა #1 — branches cleanup
რომელი branch-ი ცოცხალი სჭირდება, რომელი მიატოვო?
- A (`claude/contact-enrichment-schema`, 24K ხაზი) — ცოცხალი ნაკადი, აქ ვართ ახლა
- B (`feat/catalog-organizations-data-source`, 1.7K ხაზი) — UI რედიზაინი

### გადაწყვეტა #2 — France Import-ის დრო
- **წინ Phase 2** (recommended): ჯერ Phase 2 დაასრულე, მერე France — სუფთა, კონფლიქტის გარეშე
- **პარალელურად**: France-ი ცალკე branch-ზე, მაგრამ მერჯისას რთული კონფლიქტი

### გადაწყვეტა #3 — Phase 2-ის PR#3 (აგრესიული)
PR#3 წაშლის `organization_translations`-ს. ცხრილი ცარიელია — დაკარგვა არაფერი არ არის. გავუშვათ?

---

## 💡 ჩემი დილეტანტური რეკომენდაცია

ვიყავი არასწორად — ვფიქრობდი რომ პროექტი მარტივ მდგომარეობაშია. რეალურად 5 ცოცხალი ნაკადია. რეკომენდაცია:

1. **დღეს:** ეტაპი 1 (branches cleanup) — Claude Code IDE-ში გადახედე რა არის გასაჭრელი
2. **დღე 2-4:** ეტაპი 2 (Phase 2 დასრულება) — სუფთა შედეგი
3. **დღე 5-7:** ეტაპი 4 (France) — ჩვენი მიზანი

Contact Enrichment (ეტაპი 3) — background, არ ბლოკავს.

რომელი გადაწყვეტილებიდან დავიწყოთ?
