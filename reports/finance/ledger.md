# Finance ledger — health-abroad concierge (item 1.11)

Rule (PIVOT.md §6 rule 5, MASTER-PLAN v2 §5 row 1.11): every invoice, payment
and founder hour for the concierge is logged here — and **never any PII**.
No names, no contact details, no diagnosis, no city. "item" is the package
(orientation €290 / accompaniment €590) or a cost line; "note" is at most
"paid", "unpaid", "declined on call", "0/4 weeks". F6 (€/hour) = Σ amount / Σ hours.

If four weeks pass with no paid invoice, add one row: `YYYY-MM-DD | 0/4 weeks | 0 | <hours> | fallback M5 cold (D20)`.

| date | item | amount € | hours | note |
|------|------|----------|-------|------|
