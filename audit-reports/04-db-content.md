# Phase 4 — DB Content Audit

> Generated: 2026-05-03T11:35:06.222Z
> Source: production MySQL via MYSQL_PUBLIC_URL
> Read-only audit. No data modified.

## 1. Row counts

| t | n |
| --- | --- |
| users | 0 |
| grants | 1113 |
| grants(active) | 1102 |
| grant_translations | 4320 |
| organizations | 1110 |
| organization_branches | 1324 |
| saved_grants | 0 |
| newsletter_subscribers | 0 |
| newsletter_subscribers(active) | 0 |
| notification_history | 0 |


## 2. Organizations — coverage gaps

| total | missing_desc | missing_phone | missing_email | missing_website | missing_mission | missing_googlePlaceId | missing_languages |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1110 | 0 | 331 | 436 | 257 | 1110 | 1110 | 653 |


## 3. Organization branches — coordinate quality

| total_branches | missing_coords | null_island | bad_lat | bad_lng |
| --- | --- | --- | --- | --- |
| 1324 | 84 | 0 | 0 | 0 |


## 4. Country codes — bad values

### Organizations

| country | n |
| --- | --- |
| International | 6 |

### Grants

| country | n |
| --- | --- |
| International | 6 |


## 5. Organizations — potential duplicates (same name + country)

_(no rows)_


## 6. Grants — orphan orgId references

_(no rows)_

| grants_without_orgId | total_active |
| --- | --- |
| 968 | 1102 |


## 7. Grant translations — coverage by language

| language | n | missing_name | missing_desc | missing_eligibility |
| --- | --- | --- | --- | --- |
| es | 1080 | 0 | 0 | 0 |
| fr | 1080 | 0 | 0 | 0 |
| ka | 1080 | 0 | 0 | 0 |
| ru | 1080 | 0 | 0 | 0 |

| active_grants | en_covered | fr_covered | es_covered | ru_covered | ka_covered |
| --- | --- | --- | --- | --- | --- |
| 1102 | 0 | 1080 | 1080 | 1080 | 1080 |


## 8. Stale enrichment (verified > 90 days ago)

| stale_phone | stale_email | phone_no_provenance | email_no_provenance |
| --- | --- | --- | --- |
| 0 | 0 | 779 | 674 |


## 9. Contact enrichment — batch progress

| status | n |
| --- | --- |
| pending | 1110 |


## 10. Geographic distribution — top 15 countries

| country | n |
| --- | --- |
| US | 500 |
| FR | 493 |
| GB | 47 |
| CA | 42 |
| DE | 18 |
| International | 6 |
| GE | 2 |
| Canada | 1 |
| PL | 1 |


## 11. Users — signup + subscription summary

> ⚠ **Query failed:** `Unknown column 'emailVerified' in 'field list'`


## 12. Auth — locked / suspicious accounts

> ⚠ **Query failed:** `Unknown column 'lockedUntil' in 'field list'`


## 13. Saved grants — engagement

> ⚠ **Query failed:** `Column 'userId' in field list is ambiguous`


## 14. Newsletter — subscriber health

| total | active | unsubscribed | has_unsub_timestamp |
| --- | --- | --- | --- |
| 0 |  |  |  |


## 15. Notification history — recent campaigns

_(no rows)_
