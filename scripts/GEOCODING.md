# Geocoding Pipeline — GrantKit

## რა კეთდება

`scripts/geocode-grants.ts` Mapbox Geocoding API-ის გამოყენებით
ავსებს `grants` ცხრილის ველებს:

| ველი | შევსება |
|------|---------|
| `latitude` | decimal(10,7) — განედი |
| `longitude` | decimal(10,7) — გრძედი |
| `address` | Mapbox-ის formatted place name (თუ `address` ცარიელია) |
| `geocodedAt` | timestamp — ბოლო geocoding-ის დრო |

### Query strategy (თანმიმდევრობით)

1. `grant.address` non-empty → პირდაპირ geocoding
2. `{organization}, {city}, {country}`
3. `{organization}, {country}`
4. `{city}, {country}`
5. `{country}` — fallback
6. ვერ მოიძებნა → `geocode-failed.json`

---

## გაშვება

### 1. Dry-run (ყოველთვის ჯერ ეს)

```bash
pnpm geocode:grants:dry
```

API-ს **არ** დაუკავშირდება, DB-ს **არ** შეცვლის.
ბეჭდავს: რომელ query-ს გამოიყენებდა თითოეული grant-ისთვის.

### 2. Test on 10 grants

```bash
pnpm geocode:grants:limit10
```

10 grant-ს geocode-ავს, DB-ში წერს. შეამოწმე შედეგი:
```sql
SELECT itemId, latitude, longitude, address, geocodedAt
FROM grants WHERE geocodedAt IS NOT NULL LIMIT 10;
```

### 3. Full run

```bash
pnpm geocode:grants
```

ყველა grant-ს geocode-ავს სადაც `latitude IS NULL`.
Mapbox free tier: 600 req/min — სკრიპტი 545-ზე ჩერდება (110ms delay).
~643 grant ≈ **2 წუთი**.

---

## Resumption (გაგრძელება)

სკრიპტი checkpoint-ს ინახავს `.grantkit-redesign/geocode-checkpoint.json`:

```json
{
  "lastProcessedId": 320,
  "successful": 298,
  "failed": 22
}
```

შეწყვეტის შემდეგ გამოშვება ავტომატურად განაგრძობს შეჩერებული ადგილიდან.

Checkpoint-ის გასასუფთავებლად:
```bash
rm .grantkit-redesign/geocode-checkpoint.json
```

---

## Re-geocoding (--force)

```bash
# ყველა grant-ის ხელახლა geocoding
pnpm geocode:grants -- --force

# პირველი 50-ის ხელახლა geocoding
pnpm geocode:grants -- --force --limit=50
```

---

## Failed grants-ების დამუშავება

სრული გაშვების შემდეგ `geocode-failed.json` შეიცავს:

```json
[
  {
    "id": 42,
    "itemId": "item_0042",
    "organization": "Unknown Org",
    "reason": "No Mapbox result"
  }
]
```

### გამოსწორების ვარიანტები

1. **Admin panel-ში ხელით:** `address` ველის შევსება → `pnpm geocode:grants -- --force --limit=1`
2. **Bulk fix:** CSV-ში address-ების შევსება → `pnpm import:grants`
3. **Nationwide grants:** `serviceArea = "USA nationwide"` მიანიჭე + pin დადე HQ-ზე ხელით

---

## Geocode-ების განახლება (address შეიცვალა)

```bash
# ცალკეული grant-ის განახლება:
pnpm geocode:grants -- --force --limit=1
# (ჯერ DB-ში geocodedAt = NULL გაასუფთავე ან იყენე --force)
```

---

## Output ფაილები

| ფაილი | დანიშნულება |
|-------|------------|
| `geocode-report.json` | სტატისტიკა — total/successful/failed/duration |
| `geocode-failed.json` | ვერ-geocoded grant-ების სია |
| `.grantkit-redesign/geocode-checkpoint.json` | resume point |

---

## ENV Variables

```
MAPBOX_ACCESS_TOKEN=pk.xxx   # required (server/.env)
DATABASE_URL=mysql://...     # required
```

Mapbox token: https://account.mapbox.com/access-tokens/
`pk.` (public) token-ი საკმარისია — Geocoding API ჩართულია by default.
