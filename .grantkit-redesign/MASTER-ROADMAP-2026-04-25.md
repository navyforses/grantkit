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

### C. Phase 2 / Wave 1 — 🗄 ARCHIVED (2026-04-25)
PR#1 + PR#2 shipped (phantom infrastructure — 0 user-facing ცვლილება).
PR#3, PR#4, PR#5 — **გაუქმდა.** კვლევის დასკვნა: სრული Phase 2 user-facing პრობლემას არ წყვეტს, R2 production-outage რისკი აქვს. დეტალები: `DIAGNOSTIC-2026-04-25.md`.

ერთი ნაჭერი დარჩა cleanup-ისთვის: **`DROP TABLE organization_translations`** (ცარიელი, 0 reader/writer) — migration `0018` როცა საჭირო გახდება France Import-ის pre-step-ად.

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

### ეტაპი 2 — Phase 2 — 🗄 ARCHIVED (2026-04-25)

PR#3-#5 გაუქმდა. დეტალები: `DIAGNOSTIC-2026-04-25.md`. დარჩენილი ერთადერთი მცირე cleanup — `DROP TABLE organization_translations` — გაკეთდება France Import-ის pre-step-ად, ცალკე ეტაპად არ ითვლება.

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

**Schema:** Phase 2 ARCHIVED-ის მიუხედავად, თარგმანები JSON სვეტით — `organizations.translations` ცხრილში — `{en: {...}, fr: {...}}`. ცალკე `organization_translations` ცხრილი არ გვჭირდება (drop-ი France-ის pre-step-ად).

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
დღე 2-3: [Contact Enrich batch]    ░░░░████░░░░░░░░░░░░░
დღე 4-6: [France import + UI]      ░░░░░░░░██████░░░░░░░  (DROP org_translations როგორც pre-step)
დღე 5: [Q5 Resend DNS / Q2 redirects parallel]
```

**ჯამი: ~6 დღე active work + 2 კვირა background contact enrichment.**

---

## 💡 რეკომენდაცია (განახლებული 2026-04-25)

Phase 2 ARCHIVED-ის შემდეგ ცოცხალი 4 მიმართულება:
1. **Contact Enrichment Phase B** — script მზადაა, batch უნდა გაიშვას
2. **France Import** — JSON translations-ით, Phase 2-ის გარეშე
3. **Q5 — Resend DNS** + branded `FROM_EMAIL`
4. **Q2 — URL redirects** (SEO)

რომელი მიმართულებიდან დავიწყოთ?
