# Grant Detail — Data Gaps

> ფაილი შექმნილია Grant Detail გვერდის ვიზუალური რედიზაინის დროს
> (branch `claude/update-menu-0MGHo`). აქ ჩამოთვლილია ყველა ველი რომელიც
> target დიზაინი ითხოვს, მაგრამ ახლა DB-ში ან user profile-ში **არ არსებობს**.
>
> როცა ეს ველები შეივსება, UI ავტომატურად გამოიყვანს მათ — კოდი უკვე
> გადანაწილებულია ისე, რომ "data-driven rendering" ხდებოდეს (render-ს ფარავს,
> როცა ველი ცარიელია).

---

## 1. `grants` ცხრილში დასამატებელი სვეტები

| სვეტი | ტიპი | მაგალითი | გამოყენება UI-ში |
|-------|------|----------|------------------|
| `successRate` | `varchar(16)` ან `decimal(4,2)` | `"~15%"` ან `0.15` | 3-card Stats strip — ზედა ბოლო ბლოკი "წარმატება" |
| `deadlineDate` | `date` | `2026-05-14` | 3-card Stats strip — "ვადა" ბლოკი ("23 დღე" გამოითვლება) |
| `foundedYear` | `int` | `1982` | მარჯვენა სვეტის footer: "ფონდირებულია 1982-იდან" |
| `processingTime` | `varchar(64)` | `"4-6 კვირა"` | მარჯვენა სვეტის footer: "დამუშავების ვადა" |
| `eligibilityBullets` | `json` (ან parse `eligibility`) | `["Under 18", "US-based", ...]` | "ვინ შეგიძლია განაცხადი" — bullet list |
| `processSteps` | `json` (ან parse `applicationProcess`) | `["Submit form", "Upload docs", ...]` | "განაცხადის პროცესი" — ნუმერირებული |

**რეკომენდაცია:** `eligibilityBullets` / `processSteps` არ დავამატოთ ცალკე — უბრალოდ არსებული free-text გავლახოთ `\n` / `•` / `1.` -ით client-side-ზე. ასე DB schema ცარიელი რჩება და enrichment არ სჭირდება. **(უკვე გაკეთებულია ამ PR-ში: `client/src/lib/parseList.ts`)**

### Migration outline (როცა მზად იქნები)

```sql
ALTER TABLE grants
  ADD COLUMN successRate VARCHAR(16) NULL,
  ADD COLUMN deadlineDate DATE NULL,
  ADD COLUMN foundedYear INT NULL,
  ADD COLUMN processingTime VARCHAR(64) NULL;
```

`grantTranslations` ცხრილში `processingTime`-ის თარგმნადი ვერსია — ოთხი ენისთვის.

---

## 2. `users` ცხრილში დასამატებელი პროფილის სვეტები

Match scoring-ისთვის (target-ში "თქვენი Match: 3/4") საჭიროა:

| სვეტი | ტიპი | მაგალითი | რა Match criterion-ში გამოიყენება |
|-------|------|----------|------------------------------------|
| `ageYears` ან `dateOfBirth` | `int` / `date` | `12` / `2013-06-15` | ✅ ასაკი |
| `diagnoses` | `text` (comma-sep ან JSON) | `"pediatric oncology"` | ✅ დიაგნოზი (exact/fuzzy) |
| `annualIncomeRange` | `enum` | `"below_25k" \| "25k_50k" \| ...` | ✅ შემოსავლის ლიმიტი |

ახლა გვაქვს:
- ✅ `targetCountry` — Match criterion "ქვეყანა" სრულად მუშაობს
- ⚠️ `purposeDetails` / `needDetails` — free-text. ამისგან დიაგნოზის heuristic match შესაძლებელია, მაგრამ არასანდო.
- ❌ age, income — საერთოდ არ გვაქვს

### რეკომენდებული Onboarding ცვლილება (Phase 5-ის კანდიდატი)

Step 4 დაემატოს Onboarding-ში:
- წელი (ან dob, მერე გამოვთვალოთ)
- დიაგნოზი — multi-select (pediatric oncology, ALS, kidney disease ...)
- ოჯახის წლიური შემოსავალი — range select

---

## 3. `organizations` ცხრილთან კავშირი

Target დიზაინში მარჯვენა სვეტში ნაჩვენებია ორგანიზაციის ინფო (მისამართი, ტელეფონი, ვებსაიტი, საათები, ფონდირების წელი).

ახლა `grants.organization` არის **free-text** (not FK). ე.ი. გრანტი არ არის ფორმალურად დაკავშირებული `organizations.orgId`-თან.

**რეკომენდაცია:** `grants`-ში `organizationId` FK სვეტი (→ `organizations.orgId`). ეს განსაკუთრებით AI chat-ისთვის სასარგებლოა: ვიცოდეთ კონკრეტულად რომელი ორგანიზაცია.

### Backfill რეცეპტი

```sql
UPDATE grants g
INNER JOIN organizations o ON LOWER(TRIM(g.organization)) = LOWER(TRIM(o.name))
SET g.organizationId = o.orgId
WHERE g.organizationId IS NULL;
```

LLM fuzzy match — დარჩენილი ~30%-თვის.

---

## 4. UI-ს მიმართ: არსებული fallback

თითოეული field-ის UI render-ი **conditional**-ია. თუ ველი null-ია:

| Field | Fallback UI |
|-------|-------------|
| `successRate` | 3-card strip მხოლოდ 2 card-ს აჩვენებს (Amount + Deadline) |
| `deadlineDate` | "ვადა" card-ში ვაჩვენებთ არსებულ `deadline` სტრიქონს ("Rolling", "Contact org") |
| `foundedYear` / `processingTime` | footer meta ხაზი საერთოდ არ იქმნება |
| `eligibilityBullets` | fallback = split `eligibility` text on `\n` |
| `processSteps` | fallback = split `applicationProcess` text on `\n` |
| Match criteria | მხოლოდ იმ criterion-ებს ვიყენებთ რაზეც user profile-ში რეალური მონაცემია |

---

## 5. Priority (რეკომენდაცია)

| Priority | რა | რატომ |
|----------|-----|-------|
| 🔥 P0 | `deadlineDate` (structured) | "23 დღე" — ყველა გრანტის მთავარი UX სიგნალი |
| 🔥 P0 | User profile: `ageYears` + `diagnoses` | Match-ი 1/4-დან 3/4-ზე ადის |
| 🟡 P1 | `foundedYear` + `processingTime` | Trust signals — high-impact/low-effort |
| 🟡 P1 | `grants.organizationId` FK | AI chat quality + future features |
| 🟢 P2 | `successRate` | Nice-to-have, მონაცემი იშვიათად არსებობს პროვაიდერებთან |
| 🟢 P2 | `annualIncomeRange` | Match criterion, მაგრამ privacy-sensitive |

---

_შეიქმნა: 2026-04-21 — branch `claude/update-menu-0MGHo`_
