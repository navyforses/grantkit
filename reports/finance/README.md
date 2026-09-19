# reports/finance — ფინანსური და B2B სამუშაო ფაილები

**მფლობელი:** Levan (Partnerships & Revenue Ops) — `TEAM_ROSTER.md`. მასალა Phase 1 item 1.12 (`00-MASTER-PLAN.md` §5).

| ფაილი | რა არის | ვინ ცვლის |
|---|---|---|
| `pipeline.md` | B2B pipeline — 10 სამიზნე ორგანიზაცია × stage × €/წ × ალბათობა; KPI **F5** (შეწონილი ღირებულება) ითვლება აქედან | Levan (სტრუქტურა), მფლობელი/OP (stage, თარიღები outreach-ის შემდეგ) |
| `pitch-one-pager.md` | Pitch one-pager (fr + ka) — Institutional pilot-ისთვის და დიასპორული ასოციაციისთვის | Levan; ფასის ცვლილება მხოლოდ მფლობელის escalation-ით |
| `loi-template.md` | Lettre d'intention (fr + ka) უფასო pilot-ისთვის, ინდიკატიური ფასის ხაზით | Levan; იურიდიულ ტექსტს Salomé ამოწმებს გაგზავნამდე |
| `ledger.md` | *(1.11-ის შემდეგ)* concierge-ის ინვოისების ჟურნალი — თანხა, საათები, თარიღი | მფლობელი |

## წესები

1. **PII 0.** არც ერთ ფაილში არ იწერება ადამიანის სახელი, პირადი ელფოსტა, პირადი ტელეფონი, ბენეფიციარის ისტორია. კონტაქტის მარშრუტი = **როლი + საჯარო URL** (მაგ. „chef de service, საჯარო კონტაქტ-ფორმა"). `WORKFLOW.md` → Forbidden: „PII in `reports/finance/*`".
2. **რიცხვები ხელით არ იგონება.** ფასები → `06-profitable-site-models.md` §3B / §5.1; ალბათობები → MASTER-PLAN §7 F5 (10/30/60 %). ვერიფიცირებული ფაქტი და ვარაუდი მონიშნულია (`[verified]`, `[unverified]`, `[assumption]`).
3. **Stage-ის სემანტიკა** (`pipeline.md`): `none` → `contact` (წერილი გაგზავნილია, პასუხი არა) → `conversation` (≥1 საუბარი, 10 %) → `pilot` (LOI ხელმოწერილი / pilot მიმდინარეობს, 30 %) → `offer` (წერილობითი ფასიანი შეთავაზება განიხილება, 60 %). `none`/`contact` = 0 %.
4. **No-monetization zone:** ამ საქაღალდის არაფერი არ რენდერდება საიტზე. პარტნიორის/Pro CTA მხოლოდ `server/offers/placement.ts`-ზე გადის (`CLAUDE.md` წესი 11).
5. Pipeline-ის ცვლილება = commit „docs(finance): pipeline — <org> <old→new stage>"; F5-ის ჯამი ყოველ ცვლილებაზე ხელახლა ითვლება ცხრილშივე.
