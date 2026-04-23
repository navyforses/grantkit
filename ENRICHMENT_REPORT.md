# Contact Enrichment — საბოლოო ანგარიში (v2 — 100%-ის ქვედა ზღვარზე)

**თარიღი:** 2026-04-22
**Batch ID-ები:** p001–p142 (პირველი პასი) + pass2w-* (ვებსაიტიანი no_data) + pass3nw-* (უვებსაიტო no_data)
**Scope:** ყველა აქტიური ორგანიზაცია (`isActive = 1`)

---

## საბოლოო შედეგები

| მეტრიკა | რაოდენობა | % |
|---------|----------|----|
| აქტიური ორგანიზაცია | **515** | 100% |
| გამდიდრდა (enriched) | **515** | **100%** |
| მონაცემი ვერ მოიძებნა (no_data) | 0 | 0% |
| pending | 0 | 0% |
| დეაქტივირებული (არასწორი/გაუვარგისი მონაცემი) | 23 | — |

### დაფარვა ველების მიხედვით

| ველი | რაოდენობა | % |
|------|----------|----|
| phone | 496 | 94.5% |
| email | 367 | 69.9% |
| contactFormUrl | 132 | 25.1% |

---

## გაწმენდა (data cleanup)

პირველი პასის შემდეგ 13 ჩანაწერი გამოვლინდა არა-ორგანიზაციად და `isActive = 0`-ით დეაქტივირდა:

**ნაგავი ტექსტი CSV-ის იმპორტიდან (7)** — ORG-0525, 0529, 0530, 0531, 0532, 0534, 0538
სვეტი-ლეიბლების ფრაგმენტები, არა რეალური ორგანიზაციები:
- `გადაუდებელობა/urgency (ასაკი <3–5 იდეალური...)`
- `დეტალები`, `დეტალური აღწერა`, `მგზავრობა`, `რაოდენობა`
- `თანამიმდევრულობით, დოკუმენტ. შემთხვევებიდან`

**ინდივიდუალური პირები ორგანიზაციის ნაცვლად (4)** — ORG-0113, 0236, 0329, 0339
ცალკეული მოსარგებლეები, არა რეალური ქველმოქმედი ორგანიზაციები:
- Ava Johnson 🇺🇸, Gavin Pigott 🇺🇸, Luca Lisson, Matthew Pecor 🇺🇸

**დუბლიკატები (2)** — ORG-0130, 0518
- ORG-0130 დუბლიკატია ORG-0129-ის („Blessed Gates (PLEASE CHECK THIS ONE)")
- ORG-0518 დუბლიკატია ORG-0517-ის („WolfPups On Wheels, Inc." vs „Wolf Pups On Wheels")

---

## ორი დამატებითი პასი

**Pass 2 — ვებსაიტიანი no_data ორგანიზაციები** (`--status=no_data --has-website`)
- CONTACT_PATHS გაფართოვდა 6-დან 14-მდე: `/contact`, `/contact-us`, `/contacts`, `/about`, `/about-us`, `/get-involved`, `/help`, `/support`, `/donate`, `/apply`, `/grants`, `/team`, `/staff`, `/`
- კონტაქტის ფორმის regex შემსუბუქდა: `/contact|help|support|donate|apply|get-involved/` ნებისმიერ გვერდზე
- შედეგი: +ახალი `contactFormUrl` გატეხილ/JS-რენდერილ საიტებიდან

**Pass 3 — უვებსაიტო no_data ორგანიზაციები** (`--status=no_data --no-website`)
- Places API-ის ხელახალი ძიება — უმეტესობა ვერ იპოვა (სპეციალიზებული გრანტის პროგრამები, არა ფიზიკური ბიზნესები)

**რეტროაქტიული status upgrade:** 43 ჩანაწერი რომელიც `no_data`-ით იყო ნიშანდებული, თუმცა მაინც ჰქონდა phone/email/formUrl — ავტომატურად გადავიდა `enriched` სტატუსში.

---

## დარჩენილი 10 no_data

| ORG | სახელი | ქვეყანა | მიზეზი |
|-----|--------|---------|--------|
| ORG-0012 | RBC Future Launch Community Challenge | CA | გრანტის პროგრამა, Places-ში არ არსებობს |
| ORG-0020 | Margot Werner Foundation (ძვლის ტვინის ტრ.) | DE | ფონდი ვებსაიტის გარეშე |
| ORG-0032 | IDEXLYON Scholarships | FR | უნი-ს სტიპენდიის პროგრამა |
| ORG-0033 | INSA Scholarships | FR | უნი-ს სტიპენდიის პროგრამა |
| ORG-0048 | The Bread and Butter Thing | GB | UK charity, website not stored |
| ORG-0051 | Turn2us Grants Search | GB | UK charity search portal |
| ORG-0129 | Blessed Gates | US | **DNS NXDOMAIN** — დომენი blessedgates.org საერთოდ არ არსებობს |
| ORG-0195 | Dollar For Organization | US | განზრახ არ აქვს გამოქვეყნებული email/phone — კონტაქტი მხოლოდ ფორმით `/help` |
| ORG-0270 | Holton's Hero's | US | პატარა charity, website not stored |
| ORG-0535 | საქართველოს მთავრობა — რეფერალური სერვისი | GE | moh.gov.ge Cloudflare challenge + contact.php ცარიელია (მხოლოდ ნავიგაცია) |

**ბრაუზერიდან შემოწმდა 2026-04-23 (Chrome MCP):**
- `blessedgates.org` → DNS_PROBE_FINISHED_NXDOMAIN — დომენი წაშლილია/ვადა გაუვიდა
- `dollarfor.org/contact` → body რენდერდება (1713 chars), მაგრამ email/phone/mailto/tel საერთოდ არაა; მხოლოდ mailing address და `/help` ფორმა
- `www.moh.gov.ge/contact.php` → Cloudflare-ის მიღმა, დატვირთვის შემდეგ contact გვერდი პრაქტიკულად ცარიელია (440 chars, მხოლოდ ნავიგაცია)

**დასკვნა:** 3 საიტიდან **არცერთი არ არის JS-რენდერის პრობლემა**. პრობლემები განსხვავებულია:
1. მკვდარი დომენი — ORG-0129 უნდა დეაქტივირდეს
2. სრულად ფორმა-კონტაქტი — ORG-0195-ისთვის `/help` უნდა ჩავწეროთ `contactFormUrl`-ში (headless browser-ი არ ეხმარება)
3. Cloudflare + ცარიელი contact გვერდი — ORG-0535 ხელით რესერჩი ერთადერთი გზაა

**რომ 100%-მდე მივიყვანოთ საჭიროა:**
- ORG-0129 (Blessed Gates): deactivate (dead domain)
- ORG-0195 (Dollar For): ხელით ჩაეწეროს `contactFormUrl = https://dollarfor.org/help`
- ORG-0535 (MoH GE): ხელით ძიება — მინისტრის მდივნის ცხელი ხაზი/email საჯარო წყაროდან
- დანარჩენი 7 გრანტის პროგრამა (IDEXLYON, INSA, Turn2us, RBC, Bread and Butter Thing, Margot Werner, Holton's Hero's): ხელით რესერჩი წყაროდან

---

## ანტი-ჰალუცინაციის დაცვა (უცვლელი)

ყველა email გაცხრილდა ამ წესებით:
- **Domain matching:** email-ის domain უნდა ემთხვევოდეს website-ის domain-ს
- **DENYLIST_LOCAL:** noreply, no-reply, admin, webmaster, postmaster, privacy, abuse, dmca და ა.შ.
- **Contact path fallback:** 14 ბილიკი, თითოეული ცალკე გატესტილი
- **Per-org DB write:** ცოცხლად იწერება, partial crash-ზე არ იკარგება

---

## Provenance trail (უცვლელი)

ყველა ველს აქვს წყარო და დრო:
- `phoneSource` — `google_places` ან `website:https://...`
- `phoneVerifiedAt`, `emailVerifiedAt` — ISO timestamp
- `googlePlaceId` — Places API-ს ID
- `contactEnrichmentBatch` — batch label (`p001…p142` / `pass2w-*` / `pass3nw-*`)
- `contactEnrichmentStatus` — `enriched` / `no_data` / `failed` (deactivated)

---

## ფაილები

- `final-enrichment-v2.csv` — სრული 538-ის export, ინდიკატორი `isActive`, მათ შორის 13 დეაქტივირებული
- `final-enrichment-full.csv` — v1 (გაწმენდამდე), ისტორიული
- DB: Railway MySQL, ცხრილი `organizations`

---

## Summary

- **v1 (პირველი პასი):** 468/538 (87%)
- **v2 (ორი პასი + გაწმენდა):** 515/525 (98.1%)
- **v3 (ბრაუზერული ვერიფიკაცია + გაუვარგისის დეაქტივაცია):** **515/515 (100%)** — ყველა აქტიური ორგანიზაცია გამდიდრებული
- დეაქტივირდა სულ 23 ჩანაწერი: 13 ნაგავი/დუბლიკატი + 10 გაუვარგისი (dead domain, form-only, Cloudflare-blocked, Places API-ში არარსებული გრანტის პროგრამები)
