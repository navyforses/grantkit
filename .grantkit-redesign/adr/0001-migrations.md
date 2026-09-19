# ADR 0001 — DB migration-ების ერთი მექანიზმი

- **სტატუსი:** მიღებული (2026-09-19, Phase 0.9, MASTER-PLAN v2 §5 / I7)
- **კონტექსტი:** მექანიზმი ორთავიანი იყო. `Dockerfile` CMD ყოველ boot-ზე უშვებდა `dist/migrate.js`-ს (drizzle-orm migrator), რომლის journal `0013`-ზე მთავრდებოდა; `0014–0020` ხელით დაწერილი SQL-ია და `scripts/apply-migration-00XX.mjs`-ით გაეშვა. შედეგი: (ა) boot-time migrator უსარგებლო იყო (journal-ში ახალი არაფერი), (ბ) journal-ის შევსების შემდეგ იგივე migrator production-ზე უკვე გაშვებულ SQL-ს ხელახლა ეცდებოდა (PR #145-ის outage-ის რეცეპტი), (გ) შემდეგი `drizzle-kit generate` 0013-ის snapshot-თან diff-ს გააკეთებდა და 0014–0020-ს ერთ ფაილად გაიმეორებდა.

## გადაწყვეტილება

1. **Production-ზე migration მხოლოდ `scripts/apply-migration-XXXX.mjs`-ით** ეშვება, ხელით, **merge-მდე** (CLAUDE.md „ოქროს წესი"). Boot-time migrator არ არსებობს: `Dockerfile` CMD = `node dist/index.js`; `server/migrate.ts` და `dist/migrate.js` წაშლილია; image-ში `drizzle/` აღარ კოპირდება (schema.ts esbuild-ით `dist/index.js`-შია).
2. **Journal სრულია.** `drizzle/meta/_journal.json` შეიცავს `0000–0020`-ს. `0014–0020`-ის `when` = SQL ფაილის git commit-ის დრო (ms), მკაცრად ზრდადი (0014–0018 ერთ commit-შია → +1 წმ ნაბიჯით). ეს მნიშვნელოვანია: drizzle-ის migrator ფაილს უშვებს მხოლოდ თუ `when > max(created_at)` ბაზაში; თანაბარი `when` მეორე ფაილს გამოტოვებდა.
3. **Snapshot მხოლოდ `0020`-ს აქვს** (0014–0019-ს არა; drizzle-kit-ისთვის ხვრელი დასაშვებია — 0009-საც არ ჰქონდა). `0020_snapshot.json` = მიმდინარე `schema.ts`; `prevId` = 0013-ის `id`. ამიერიდან `drizzle-kit generate` სწორ diff-ს აკეთებს.
4. **Breakpoints.** drizzle-ის migrator SQL-ს ყოველთვის `--> statement-breakpoint`-ით ყოფს და ყოველ ნაწილს ცალკე `execute`-ით უშვებს (mysql2, multipleStatements გარეშე). `0018`, `0019`-ში markers დაემატა (სემანტიკა უცვლელი; sha256 შეიცვალა → მათი apply script-ის „already recorded" შემოწმება ამ hash-ს ვეღარ იპოვის; ორივე production-ზე უკვე გაშვებულია და ხელახლა არ ეშვება). `0020` ერთი statement-ია — უცვლელი, `check-migration-0020.mjs`-ის hash ვალიდურია.
5. **ახალი migration-ის რეცეპტი (0021+):** `schema.ts` ცვლილება → `DATABASE_URL=mysql://x:y@localhost/z pnpm exec drizzle-kit generate --name=<სახელი>` (DB-ს არ უკავშირდება; ქმნის SQL + snapshot + journal entry) → SQL-ის გადახედვა/რედაქტირება → `scripts/apply-migration-XXXX.mjs` (0020-ის ნიმუშით: apply + `__drizzle_migrations`-ში ჩაწერა + ვერიფიკაცია) → PR (schema + SQL + apply + rollback SQL, ცალკე კოდისგან) → apply Railway-ზე → `SELECT <სვეტი> LIMIT 1` → merge.
6. **`pnpm db:push`** (`drizzle-kit generate && drizzle-kit migrate`) მხოლოდ **ცარიელი ლოკალური DB-სთვის**; production `DATABASE_URL`-ით არასდროს.

## შედეგები

- Deploy-ი ვეღარ ცვლის სქემას — სქემის ცვლილება ყოველთვის ადამიანის ნაბიჯია merge-მდე.
- ცარიელ DB-ზე `drizzle-kit migrate` → `0000–0020` სრულად (0015 ქმნის და 0018 შლის `organization_translations`-ს — ეს ისტორიის ნაწილია).
- ცნობილი drift (schema.ts ≠ Railway, არ სწორდება ამ ADR-ით): `grants.fk_grants_org` FK (0017) schema.ts-ში არ არის აღწერილი; `organization_housing.createdAt` DB-ში nullable, schema.ts-ში `notNull`. drizzle-kit ბაზას არ კითხულობს, ამიტომ diff-ს არ აწარმოებს; 0021-ის PR-ში გადაწყდება, აღიწეროს თუ არა FK schema.ts-ში.

## ვერიფიკაცია (sandbox, 2026-09-19)

- `drizzle-kit check` → „Everything's fine"; `drizzle-kit generate` → „No schema changes, nothing to migrate" (snapshot 0020 ≡ schema.ts).
- Probe: 0013 snapshot → schema.ts diff-ი ზუსტად ემთხვევა 0014–0020-ის სტატემენტების გაერთიანებას (FK-ისა და housing.createdAt-ის გარდა, ზემოთ).
- `readMigrationFiles()` → 21 entry; 0014–0020-ის ყოველი chunk ერთი statement-ია.
- ცარიელ MySQL-ზე გაშვება sandbox-ში შეუძლებელია (docker daemon არ არის) — **ოპერატორი:** `DATABASE_URL=<ლოკალური ცარიელი DB> pnpm exec drizzle-kit migrate` ერთხელ; და Railway-ზე `node scripts/check-migration-0020.mjs` (output → PROJECT_MAP).
