# Daily Grant Discovery — 2026-04-20 Run Report

**Status:** ❌ ვერ გაეშვა — sandbox ჩავარდა (მეორე ცდა იმავე დღეს იმავე შედეგით)
**დრო:** 2026-04-20 (ორი ცდა)

## მიმდინარე ცდის (run #2) შედეგი

1. **pnpm ხელმისაწვდომია corepack-ით:** `mkdir -p ~/.local/bin && corepack enable --install-directory ~/.local/bin pnpm` მუშაობს — დაყენდა pnpm 10.33.0. ეს პირველი ცდისგან მიღწეული პროგრესია.

2. **მაგრამ OneDrive node_modules მაინც გატეხილია:**
   ```
   Error: Cannot find module '/sessions/.../node_modules/tsx/dist/cli.mjs'
   ```
   `tsx` ფაილი ჩანს listing-ში, მაგრამ node-ი ვერ კითხულობს. იგივე სურათი, რაც run #1-ზე.

3. **Workaround ცდა (tsx + deps /tmp-ში):**
   - `/tmp/tsx-runner/`-ში დავაყენე tsx, dotenv, mysql2
   - პროექტის script-ი კოპი გავაკეთე `/tmp/discovery-run/scripts/`-ში
   - Script-მა ვერ იმუშავა: `ERR_MODULE_NOT_FOUND` dotenv-ისთვის (ESM resolution NODE_PATH-ს არ იცავს)
   - სიმლინკიანი node_modules-ით ხელახლა ცდის დროს bash session-ი გაიყინა: `RPC error: oneshot already running` — ზუსტად ისე, როგორც run #1-ზე და როგორც memory-ში ეწერა.

4. **შედეგი:** `pending-imports/discovery-2026-04-20.json` ფაილი **არ შექმნილა**. DB-ში ახალი გრანტი **არ დაემატა**. Newsletter **არ გაგზავნილა**.

## სამოქმედო გეგმა

**მოკლევადიანი (დღესვე):** თუ დღევანდელი discovery გინდა, გაუშვი Windows-ზე:
```powershell
cd "C:\Users\jinch\OneDrive\სამუშაო დაფა\გრანდკიტი\grantkit-main"
pnpm tsx scripts/daily-discovery.ts
pnpm tsx scripts/import-new-grants.ts --file=pending-imports/discovery-2026-04-20.json --notify
pnpm tsx scripts/audit-translations.ts
pnpm tsx scripts/translate-missing.ts
```

**გრძელვადიანი:** Cowork scheduled task-ი (`daily-grant-discovery`) წაშალე ან გააჩერე. ის მხოლოდ ცარიელ error report-ებს წერს. **ნამდვილი scheduler** უკვე აწყობილია:
- `.github/workflows/daily-discovery.yml` — ყოველ დღე 08:00 UTC
- GitHub Secrets დაყენებულია (DATABASE_URL, ENRICHMENT_API_URL, ENRICHMENT_API_KEY, RESEND_API_KEY)
- CLAUDE.md-ში ფაზა 4 დადასტურებულია

## Root cause შეჯამება (ორივე run-იდან)

Cowork-ის Linux sandbox ვერ გაუშვებს GrantKit-ის Node scripts-ს OneDrive-ზე დამიბმულ node_modules-ის წინააღმდეგ:
- symlinks + Windows reparse points + OneDrive file-on-demand → random Input/output errors
- scan-ი ბმულების რეზოლუციისას ხშირად იყინებს bash session-ს ("oneshot already running")
- corepack-იანი pnpm დაყენებაც ამ მდგომარეობას ვერ სჭრის — dep resolution ყოველთვის node_modules-ს ეკითხება

GitHub Actions runner-ი (Ubuntu, სუფთა workspace) — ერთადერთი დადასტურებული გზა ამ pipeline-ისთვის.
