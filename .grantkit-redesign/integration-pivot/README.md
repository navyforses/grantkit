# Integration Pivot — დიაგნოსტიკა, კვლევა, ფინანსური ანალიზი და გეგმა v2 (2026-09-19)

> **რა არის ეს საქაღალდე:** GrantKit-ის „ემიგრანტების ინტეგრაციის მხარდაჭერის საიტად" გადაქცევის სრული საფუძველი — შვიდი სპეციალისტის ანგარიში და ერთი მენეჯერის შეჯერებული გეგმა. შექმნილია Claude Code სესიებში პარალელური აგენტებით + 1 მენეჯერით.
> **ენა:** ქართული; ტექნიკური ტერმინები, ფაილის სახელები და კოდის იდენტიფიკატორები — ინგლისურად.
> **v2 (2026-09-19):** მფლობელის კითხვაზე „არის თუ არა ეს პროექტი მომგებიანი, როგორი უნდა იყოს მომგებიანი საიტი და როგორ დავაპროგრამოთ ის" დაემატა ანგარიშები 05–07 და `00-MASTER-PLAN.md` გადაიწერა v2-ად (v1 → `archive/`).
> **სტატუსი:** გეგმა განსახილველად. კოდი არ შეცვლილა. ერთადერთი არა-დოკუმენტური ცვლილება (PR #247) — `AUDIT-CONTINUATION-2026-05-03.md`-დან commit-ებული production პაროლის ამოღება (მნიშვნელობა git history-ში რჩება → rotation სავალდებულოა).

## წაკითხვის რიგი

| # | ფაილი | ავტორი (persona) | რას პასუხობს |
|---|---|---|---|
| 0 | **[`00-MASTER-PLAN.md`](./00-MASTER-PLAN.md)** (v2) | Tamar — მენეჯერი | **დაიწყე აქედან.** §0.1 „რა შეიცვალა v1-თან"; §2 ფინანსური ბირთვი (მომგებიანი საიტის დიზაინი, უფასო/ფასიანი საზღვარი, no-monetization zone კოდის დონეზე, 3-წლიანი P&L, break-even, პატიოსანი ჩარჩო); კონსოლიდირებული დიაგნოსტიკა ფინანსური P0-ებით; gap analysis; roadmap შემოსავლის milestone-ებით და „done when" კრიტერიუმებით; გუნდი (10 persona); მისიის + ფინანსური KPI; 26 გადაწყვეტილება (9 ⛔); უახლოესი 7 დღე; 24 შეუთანხმებლობის გადაწყვეტა. v1: [`archive/00-MASTER-PLAN-v1.md`](./archive/00-MASTER-PLAN-v1.md) |
| 5 | [`05-financial-analysis.md`](./05-financial-analysis.md) | Nika — ფინანსური ანალიტიკოსი | ხარჯების ბაზა ფაზებად (infra, AI, Maps, Paddle, მფლობელის დრო), TAM/SAM/SOM, შემოსავლის მოდელები M0–M6 3-წლიანი პროექციით, break-even, sensitivity. ვერდიქტი: $9 B2C ვერ მუშაობს; self-sustaining მისიის პროდუქტი |
| 6 | [`06-profitable-site-models.md`](./06-profitable-site-models.md) | Levan — მონეტიზაციის სტრატეგი | ვინ იხდის ემიგრანტის მოგზაურობაში, მომგებიანი comparables (Expatica→Wise), 4 კონცეფცია რანჟირებით, რეკომენდებული დიზაინი გვერდი-გვერდ, ნდობის კონტრაქტი, პირველი 10 გადამხდელი |
| 7 | [`07-monetization-architecture.md`](./07-monetization-architecture.md) | Arash — Staff engineer | entitlements/plans + middleware, Paddle repair, B2B tenancy (embed/API), partner offers ეთიკური allowlist-ით, concierge, metering, attribution, SEO, migration mapping 0021–0025 |
| 1 | [`01-integration-needs.md`](./01-integration-needs.md) | Ezra — ინტეგრაციის მკვლევარი | რას ნიშნავს „ემიგრანტების ინტეგრაციის მხარდაჭერა" (Ager & Strang, EU CBP, Zaragoza, OECD/EU, MIPEX); სტატუსები და უფლებები; journey ეტაპებად; საჭიროებების ევიდენსი (40 წყარო); 5 პერსონა; სერვის-მოდელი; 11-დომენიანი ტაქსონომია |
| 2 | [`02-competitors.md`](./02-competitors.md) | Nino — ბაზრის ანალიტიკოსი | 24 პლატფორმა (Réfugiés.info, Soliguide, Integreat, Handbook Germany, USAHello, Signpost, Findhelp, Turn2us…); feature matrix; კონტენტ- და ბიზნეს-მოდელები; white space (ქართული არავის აქვს); 3 პოზიციონირების ვარიანტი; რისკები (65 წყარო) |
| 3 | [`03-tech-diagnostic.md`](./03-tech-diagnostic.md) | Arash — Staff engineer | გადამოწმებული `pnpm check/test/build/audit`; 25 finding P0–P3 `file:line`-ით; არქიტექტურა; დოკუმენტაციის წინააღმდეგობები; 14-capability pivot-readiness; reuse vs rebuild; top-10 ტექნიკური ნაბიჯი |
| 4 | [`04-product-ux-data.md`](./04-product-ux-data.md) | Priya — პროდუქტის დიზაინერი | 12-განზომილებიანი scorecard (საშუალო 1.9/5); top-10 პრობლემა; მონაცემთა მოდელის შესაბამისობა + ტაქსონომიის mapping + დაფარვის რიცხვები; quick wins vs სტრუქტურული; 3 სამიზნე journey; ka copy spot-check; screenshot-ები [`screens/`](./screens/) |
| 8 | [`08-online-validation.md`](./08-online-validation.md) | Ezra — ინტეგრაციის მკვლევარი | Phase 1 item 1.1-ის ონლაინ ჩანაცვლება (2026-09-19): ka/ru მოთხოვნის ევიდენსი (OFPRA/EUAA რანგები, არხები, 20 განმეორებადი კითხვა), ტაქსონომიის label-ების შემოწმება, FR მონაცემთა სიახლის baseline (5 org), WTP comparables (Integreat/Soliguide/Findhelp/facilitator-ები), €0 fake-door ტესტი, ვერდიქტი 1.1-ის done-when-ზე |

## TL;DR (სრულად — `00-MASTER-PLAN.md` §0, v2)

- **განმარტება:** ინტეგრაციის მხარდაჭერა GrantKit-ისთვის = ახალჩამოსულის **ძიების, ორიენტაციისა და ნდობის ხარჯის შემცირება** — მის ენაზე, მისი სტატუსისა და ეტაპის მიხედვით ვუთხრათ *ვინ* დაეხმარება, *სად*, *რა პირობით*, *რა საბუთით*, *როგორ მიაღწიოს*. არა თავად დახმარების გაწევა. **ემიგრანტისთვის ყველაფერი უფასოა და ასეც დარჩება.**
- **პოზიციონირება:** „ინტეგრაციის ნავიგატორი ქართველი და რუსულენოვანი ემიგრანტებისთვის" — ენა-first, სტატუს-first, სიღრმე > სიგანე. საფრანგეთი = ვალიდაცია + reference implementation; აშშ სამედიცინო = `health` ვერტიკალი.
- **ბიზნეს-მოდელი (v2):** იხდიან, ვინც ემიგრანტი არ არის — (1) ორგანიზაციები/ინსტიტუტები ka/ru ფენისა და ინსტრუმენტებისთვის (Org Pro €300–900/წ, Institutional €2–6k/წ; helper account უფასო), (2) ოჯახები ring-fenced `/health-abroad` concierge-ისთვის (€290/€590, კლინიკის კომისია 0), (3) პარტნიორები/სპონსორი მხოლოდ კომოდიტიზებულ ნაბიჯებზე (SIM, ბანკი/გზავნილი, თარგმანი, ენა) კოდის დონის no-monetization zone-ით. გრანტები = runway. Helper Pro ინდივიდუალური და $9 B2C ამოღებულია. Base P&L €16k → €52k → €105k; break-even infra თვე 4–6, სრული (მფლობელის დროით) ≈ თვე 30. პატიოსანი ჩარჩო: self-sustaining მისიის პროდუქტი, არა venture.
- **ფაზები:** 0 ჰიგიენა + P0 (ფინანსური P0-ს ჩათვლით; კვ. 1–2) → 1 ვალიდაცია + რეპოზიციონირება + **პირველი ევრო** (კვ. 2–4) → 2 კონტენტ-მოდელი + `/fr/essentials` + partner v0 (კვ. 5–10; cash ≥ €1k, 3 pilot) → 3 billing/entitlements + org portal + retention (კვ. 11–16; MRR ≥ €250) → 4 მასშტაბი (თვე 5+; €1k/თვე run-rate).

## ⛔ დაუყოვნებელი (P0) — ოპერატორის მოქმედება

1. **Production MySQL root პაროლი** commit-ებული იყო `AUDIT-CONTINUATION-2026-05-03.md`-ში. ტექსტი ამოღებულია, **history-ში რჩება** → Railway-ზე reset სავალდებულოა (`OPS.md` §Secret rotation). Google Maps ორივე გასაღებიც rotation-ს ითხოვს.
2. **ფინანსური P0:** `smartSearch` საჯარო, cache 0, 100 req/min/IP → $4,300/თვე ერთი IP-დან. LRU cache + 10/min (Phase 0.5) მარკეტინგის დაწყებამდე.
3. **Billing:** Paddle webhook fail-closed-ია, `PADDLE_WEBHOOK_SECRET` დოკუმენტირებულ სიაში არ არის, migration `0020` დაუდასტურებელია. გადაწყვეტილება D2: pause ახლა, repair Phase 3.7.
4. **ყალბი ნდობის სიგნალები** copy-ში („500+ Active members", „538 verified", „640+", „29 ქვეყანა") — users = 0, verification = 0.

## გადაწყვეტილებები, რომლებიც Phase 0/1-ს ბლოკავს (`00-MASTER-PLAN.md` §8)

**D26 ჰორიზონტი (პირველი)** · D1 paywall / ვინ იხდის (შეიცვალა) · D2 billing (შეიცვალა) · D3 history rewrite · D5 beachhead · D6 სტატუსი client-only · **D19 პარტნიორ-შეთავაზებები** · **D20 health-abroad concierge** · **D23 იურიდიული პირი**. თითოეულზე რეკომენდაცია გეგმაშია; პასუხები `../PIVOT.md` §4-ში.

## როგორ გამოვიყენოთ აგენტებთან

- ყოველი ახალი სესია: `KARPATHY_GUIDELINES.md` → `CLAUDE.md` → `PROJECT_MAP.md` → `OPS.md` → `PIVOT.md` → **`00-MASTER-PLAN.md` §5 (ფაზა) + §6 (persona)**.
- Persona-ები, ფაილების ownership, პარალელიზაცია და მენეჯერის პროტოკოლი — `00-MASTER-PLAN.md` §6. ეს Claude Code სესიების როლებია, არა ადამიანები.
- ყოველი roadmap item-ს აქვს „done when" — სესია სრულდება მხოლოდ მისი გავლისას (Karpathy §4).
- **No-monetization-zone წესი** (`PIVOT.md` §6.4): პარტნიორის/Pro badge-ის/ფასიანი CTA-ს ნებისმიერი რენდერი გადის `selectOffers()`-ზე და allowlist-ზე; „არასდროს" ტესტების გარეშე მონეტიზაციის PR არ merge-დება.

## მეთოდი და შეზღუდვები

- Sandbox-იდან production URL და DB მიუწვდომელი იყო (proxy 403); ცოცხალი რიცხვები ციტირებულია 2026-05 `audit-reports/`-დან და ასეა მონიშნული.
- ვებ-კვლევა: WebSearch/WebFetch; სამიზნე საიტების ნაწილი დაბლოკილი იყო → მეორადი წყაროები, „unverified" მარკერით.
- ფინანსური რიცხვები მონიშნულია [fact]/[benchmark]/[assumption]; მფლობელის საათი €25 [assumption] — sensitivity 05 §6-ში.
- `pnpm check` (0 error) · `pnpm test` (201/202) · `pnpm build` (OK) · `pnpm audit --prod` (57 vuln, 0 critical) — გაშვებულია დიაგნოსტიკის სესიაში.
