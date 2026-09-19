# Handoff Brief → Claude Code (IDE) — Wave 1

> ეს ფაილი უნდა მისცე Claude Code-ს Cursor/VS Code-ში როგორც პრომპტი.
> Cowork (მე) უკვე გავაანალიზე Excel, შევთანხმდით ყველა გადაწყვეტილებაზე.
> ახლა შენ აშენებ Schema + Import scripts-ს. UI Wave 3-ში მოდის.

---

## კონტექსტი

**ფაილი:** `data/France_Emigration_Organizations_5_Languages.xlsx` (624 ფრანგული ორგანიზაცია, 5 ენა). მომხმარებელი ატვირთავს ამ ფაილს `data/`-ში მერჯამდე.

**ფაქტები:**
- 624 რიგი, ყველა საფრანგეთი
- Georgian sheet: 30 სვეტი (full); English/Español/Français/Русский: 21 სვეტი თითო
- `~80%` ნათარგმნი, `~20%` ცელი ისევ ქართულადაა non-KA sheet-ებზე → **NULL ჩაწერე**, არ ჩაწერო ქართული ცელი ფრანგულის თარგმანში
- Housing-სპეციფიკური სვეტები (21–29) მხოლოდ Georgian sheet-ზე — **102 ორგანიზაცია** (ჯანმრთელობასთან დაკავშირებული თავშესაფრები)
- Cities col ხშირად CSV (მაგ. "Lyon, Paris") და 54 ორგ-ი 31 ქალაქს ჩამოთვლის (multi-city → იხ. გადაწყვეტილება #3)

**უკვე არსებული infra:**
- `drizzle/schema.ts` — `organizations`, `organization_branches`, `organization_translations`
- ბოლო migration — `0016_contact_provenance` (გავრცელდა Railway-ზე)
- `scripts/import-organizations.ts` — წინა იმპორტის template
- `scripts/apply-migration-0016.mjs` — apply script template
- `scripts/translate-missing.ts` — translation pipeline (Forge/Gemini)

---

## შენი დავალება: PR1.1 + PR1.2

### 🎯 PR1.1 — Schema migration 0017

შექმენი:
1. `drizzle/0017_org_extensions_and_housing.sql`
2. `scripts/apply-migration-0017.mjs` (template: `apply-migration-0016.mjs`)
3. განახლე `drizzle/schema.ts`

#### ახალი სვეტები `organizations` ცხრილში

```sql
ALTER TABLE organizations
  ADD COLUMN abbreviation        VARCHAR(32),
  ADD COLUMN organizationType    ENUM('NGO','association','government','private') NULL,
  ADD COLUMN servicesOffered     TEXT,
  ADD COLUMN targetAudience      TEXT,
  ADD COLUMN emigrationPurpose   VARCHAR(64),     -- CSV: "all,study,medical,work"
  ADD COLUMN foundedYear         INT,
  ADD COLUMN legalStatus         VARCHAR(255),
  ADD COLUMN mainCategory        VARCHAR(64),
  ADD COLUMN isNational          BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX orgs_main_category_idx  ON organizations(mainCategory);
CREATE INDEX orgs_is_national_idx    ON organizations(isNational);
CREATE INDEX orgs_org_type_idx       ON organizations(organizationType);
```

#### ახალი სვეტები `organization_translations`-ში

```sql
ALTER TABLE organization_translations
  ADD COLUMN servicesOffered     TEXT,
  ADD COLUMN targetAudience      TEXT;
```

#### ახალი ცხრილი `organization_housing`

```sql
CREATE TABLE organization_housing (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  orgId           VARCHAR(16)  NOT NULL,                                  -- FK → organizations.orgId
  housingType     ENUM('parents_house','shelter','social','temporary','hotel','apartment','other') NULL,
  description     TEXT,
  registrationProcess  TEXT,
  costDetails     TEXT,
  maxStayDuration VARCHAR(64),
  capacity        VARCHAR(64),
  childrenFriendly      ENUM('yes','no','unknown') DEFAULT 'unknown',
  disabledAccessible    ENUM('yes','no','unknown') DEFAULT 'unknown',
  relevanceNotes  TEXT,
  createdAt       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY org_housing_idx (orgId),
  INDEX housing_type_idx (housingType)
);
```

> ⚠️ Migration golden rule (PROJECT_MAP.md): merge-ის წინ **Cowork (მე)** გავუშვებ `apply-migration-0017.mjs`-ს Railway-ზე. შენ მხოლოდ PR-ს გახსნი.

---

### 🎯 PR1.2 — `scripts/import-france-orgs.ts`

CLI flags: `--dry-run` (default), `--apply`, `--notify`.

#### Pipeline

```
1. Parse Excel → 5 sheet-ი → struct[] (per row, all langs)
2. De-dup matcher → existing orgs lookup
3. Per row:
   a. UPSERT organizations (NEW values override OLD — გადაწყვეტა #1)
   b. UPSERT organization_translations (4 ენა; SKIP თუ ცელი ქართულადაა non-KA sheet-ზე)
   c. UPSERT organization_housing (მხოლოდ თუ Georgian sheet-ზე housingType არ არის NULL)
   d. UPSERT organization_branches (city-per-row, თუ NOT National)
4. Report: rows_processed, matched, created, translation_gaps, housing_records
5. თუ --notify: newsletter batch trigger (Resend, batch="france-2026-04-24")
```

#### De-dup matcher (გადაწყვეტა #1: NEW overrides OLD)

```typescript
// 3 ფაზა — პირველი match იმარჯვებს
async function findExistingOrg(name: string, website: string|null, phone: string|null) {
  // Phase 1: name (lowercased, trimmed) + country='FR'
  const byName = await db.select().from(organizations)
    .where(and(
      sql`LOWER(TRIM(name)) = ${name.toLowerCase().trim()}`,
      eq(organizations.country, 'FR')
    ))
    .limit(1);
  if (byName[0]) return byName[0];

  // Phase 2: website domain match
  if (website) {
    const domain = extractDomain(website);
    if (domain) {
      const byDomain = await db.select().from(organizations)
        .where(sql`LOWER(website) LIKE ${'%' + domain + '%'}`)
        .limit(1);
      if (byDomain[0]) return byDomain[0];
    }
  }

  // Phase 3: phone match (E.164 normalized)
  if (phone) {
    const normPhone = normalizePhone(phone);
    const byPhone = await db.select().from(organizations)
      .where(eq(organizations.phone, normPhone))
      .limit(1);
    if (byPhone[0]) return byPhone[0];
  }

  return null;
}

// UPDATE policy: NEW overrides OLD on every column where Excel has non-NULL
// (გადაწყვეტა #1 — შაკოს დადასტურებული)
function buildUpdatePayload(excelRow, existingRow) {
  const payload = {};
  for (const [col, val] of Object.entries(excelRow)) {
    if (val !== null && val !== '') payload[col] = val;
  }
  return payload;
}
```

#### Cost mapping constant (გადაწყვეტა #2)

```typescript
const COST_MAPPING: Record<string, ServiceCost> = {
  // free
  'უფასო': 'free',
  'უფასო (მიგრანტებისთვის)': 'free',
  'უფასო (სამონტაჟოებისთვის)': 'free',
  'სერვისები უფასოა საჭიროების შემთხვევაში.': 'free',

  // paid
  'ფასიანი': 'paid',
  'გადახდილი': 'paid',
  'გადახდადი': 'paid',
  'გადასახადი': 'paid',
  'გადასახადიანი': 'paid',

  // sliding_scale
  'სუბსიდირებული': 'sliding_scale',
  'უფასო / სუბსიდირებული': 'sliding_scale',
  'უფასო/სუბსიდირებული': 'sliding_scale',
  'უფასო ან სუბსიდირებული': 'sliding_scale',
  'დაფინანსებული': 'sliding_scale',
  'საბაზისო დაფინანსება': 'sliding_scale',
  'საფინანსო მხარდაჭერით': 'sliding_scale',
  'შემწეობილი': 'sliding_scale',
  'წახალისებული': 'sliding_scale',
  'შემცირებული': 'sliding_scale',

  // insurance
  'გადახდილი (ჩვეულებრივ ინსტიტუტების მიერ)': 'insurance',
  'სუბსიდირებული / ინსტიტუტების მიერ გადახდილი': 'insurance',
  'ფასიანი (კერძო პროფესიონალები)': 'insurance',

  // mixed
  'უფასო / ფასიანი': 'mixed',
  'ფასიანი/სუბსიდირებული': 'mixed',
  'ფასიანი / სუბსიდირებული': 'mixed',
  'გადის / სუბსიდირებული': 'mixed',
  'უფასო / წევრობის საფასური': 'mixed',
  'უფასო / წევრობის გადასახადი': 'mixed',
  'წევრობის საფასური': 'mixed',
  'გაწევრიანების საკრედიტო გადასახადი': 'mixed',
  'დაახლოებით 10 ევრო ღამეში.': 'mixed',
  'უფასო კონსულტაცია': 'mixed',
};

function mapCost(raw: string | null): ServiceCost {
  if (!raw) return 'unknown';
  const trimmed = raw.trim();
  return COST_MAPPING[trimmed] ?? 'unknown';
}
```

#### Translation gap handling (გადაწყვეტა #4)

```typescript
function isGeorgianText(s: string | null): boolean {
  if (!s) return false;
  return /[Ⴀ-ჿ]/.test(s);
}

function getTranslation(row: ExcelRow, lang: 'en'|'fr'|'es'|'ru', col: 'description'|'servicesOffered'|'targetAudience'): string | null {
  const value = row[lang]?.[col];
  if (!value) return null;
  // თუ non-KA sheet-ზე ცელი ქართულია → SKIP, translate-pipeline-მა შეავსოს
  if (isGeorgianText(value)) return null;
  return value;
}
```

#### Multi-city handling (გადაწყვეტა #3)

```typescript
function parseCities(citiesCell: string | null): { isNational: boolean; cityList: string[]; primaryCity: string | null } {
  if (!citiesCell) return { isNational: false, cityList: [], primaryCity: null };
  const split = citiesCell.split(',').map(s => s.trim()).filter(Boolean);
  if (split.length >= 10) {
    // 31-city behemoth → mark as National, store cityList in serviceArea, only 1 HQ branch
    return { isNational: true, cityList: split, primaryCity: split[0] };
  }
  return { isNational: false, cityList: split, primaryCity: split[0] };
}

// org-ის city ცელში: primaryCity (HQ-ის ქალაქი)
// org-ის serviceArea ცელში: თუ isNational, ჩაწერე "Available in 31 cities: Paris, Lyon, ..."
//   UI Wave 3-ში "See all 31 cities" link-ი ამ string-ს გაშლის
// branches: მხოლოდ HQ branch (city = primaryCity)
```

#### Org-housing (გადაწყვეტა #5 — UI later)

თუ Georgian sheet-ზე col 21 (`housingType`) არ არის NULL, შეავსე `organization_housing` row.
`relevanceNotes` ცელში (col 29) ჩაწერე როგორც-არის — UI Wave 3-ში გაჩნდება ყვითელი ბანერად.

#### Logging / report (dry-run)

```
== Dry run summary ==
Excel rows:           624
Matched existing:     XXX  (will UPDATE)
New orgs:             XXX  (will INSERT)
Translation skipped:  XXX cells (Georgian on non-KA sheet)
Housing records:      102
National orgs:        54
Cost mapped:          XXX  (XX → unknown)
```

---

## ✅ Definition of done

- `pnpm tsc` წარმატებული
- Migration SQL TypeScript-სქემა ემთხვევა (`pnpm db:generate` clean)
- `import-france-orgs.ts --dry-run` ბაზაზე უსაფრთხოდ გადის (read-only)
- Dry-run output Cowork-ისთვის გაგზავნილი
- PR-ის description-ში ჩამოწერე გადაწყვეტილებები რომელ ფუნქციაში სად აისახება

## ⚠️ რა **არ** უნდა გააკეთო

- **არ გაუშვა migration Railway-ზე** — Cowork (მე) ამას აკეთებ.
- **არ შეცვალო `client/src/pages/Catalog.tsx`** (frozen)
- **არ შეცვალო `OrganizationDetail.tsx`** — UI მოდის Wave 3-ში ცალკე briefing-ით.
- **არ ჩასვა schema.ts-ში სვეტი თუ migration SQL-ში არ არის** (PR #145-ის outage)

## შემდეგი ნაბიჯი

PR გახსნა → me ping → Cowork (მე) გავუშვებ migration-ს Railway-ზე → dry-run → თუ output კარგია, --apply.
