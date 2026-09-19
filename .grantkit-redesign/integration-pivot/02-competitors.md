# 02 — კონკურენტული და საბაზრო ანალიზი: GrantKit → ემიგრანტების ინტეგრაციის პლატფორმა

**ავტორი:** Nino — Competitive & Market Analyst
**თარიღი:** 2026-09-18
**მეთოდი:** desk research (WebSearch; სამიზნე საიტების უმეტესობა sandbox proxy-ით დაბლოკილი იყო, ამიტომ ფაქტები მეორად წყაროებზე — პრესა, ოფიციალური ანგარიშები, app store, GitHub, Wikipedia — დაყრდნობით არის აღებული). GrantKit-ის ფაქტები — `CLAUDE.md`, `ORG-CENTRIC-MEMORY.md`, `en.ts`, `audit-reports/12-subscription-funnel.md` და manager-ის brief-იდან.
**კონვენცია:** `[n]` = წყარო სექცია 9-ში; **[ფაქტი]** = ციტირებადი; **[შეფასება]** = ჩემი განსჯა; **unverified** = ვერ დავადასტურე.

---

## 1. Executive summary

1. **[ფაქტი]** ემიგრანტების ინფორმაციის ბაზარი ფაქტობრივად 100%-ით უფასოა მომხმარებლისთვის და ფინანსდება სახელმწიფოს, EU-ის (AMIF), ფონდებისა და Big Tech-ის მიერ: Réfugiés.info (DIAIR/beta.gouv, 1M+ unique visitors 2024) [1][2], Soliguide (27,600 სტრუქტურა, 3.7M ძიება/წელი) [3][4], Integreat (~140 მუნიციპალიტეტი, MIT/Apache) [5][6], Handbook Germany (€9M EU + €300k/წ BMI 2023–25) [7], USAHello (3.5M ადამიანი 2024, $904k შემოსავალი, 94.5% შემოწირულობა) [8][9].
2. **[შეფასება]** $9/თვე B2C subscription ამ აუდიტორიაზე — არა-სიცოცხლისუნარიანია როგორც ძირითადი მოდელი. ერთადერთი წარმატებული ფასიანი პრეცედენტები (GrantWatch $49/თვე, Instrumentl $299+/თვე, Candid $54.99+/თვე) ყიდიან *ორგანიზაციებზე*, სადაც ROI ითვლება [10][11][12]. Turn2us — GrantKit-ის ყველაზე ახლო წინაპარი — უფასოა ფიზიკური პირებისთვის და ქველმოქმედებით ფინანსდება [13].
3. **[ფაქტი]** არცერთ პროფილირებულ პლატფორმას არ აქვს **ქართული ენა**: Réfugiés.info — 8 ენა, Handbook Germany — 9, Soliguide — 8, USAHello — 7, Settle In — 7, Signpost — 25 (ka არ ჩანს) [1][7][14][8][15][16]. ქართული სახელმწიფო პორტალები (gda.ge, migration.commission.ge) ფოკუსირებულია დაბრუნებაზე/რეინტეგრაციასა და საკონსულო სერვისებზე, არა უცხოეთში ინტეგრაციაზე [17][18]. ეს არის **დადასტურებული white space**.
4. **[ფაქტი]** ქართველები საფრანგეთის top-5 თავშესაფრის მაძიებელ ეროვნებაშია (8,099 პირველი განაცხადი 2022-ში) [19]; EU+-ში აღიარების მაჩვენებელი ~4% [20]. **[შეფასება]** ⇒ უმეტესობა უსტატუსო/პრეკარიულ მდგომარეობაში რჩება — ზუსტად ის სეგმენტი, რომელსაც GrantKit-ის „accepts undocumented / uninsured" სიგნალები სჭირდება.
5. **[შეფასება]** კონტენტ-მოდელის გამარჯვებულები აერთიანებენ **პროცედურებს + დირექტორიას**: Réfugiés.info (démarches + fiches actions, 950 კონტრიბუტორი) [2], Integreat (მუნიციპალური CMS + POIs), Handbook Germany (გიდები + ბლოგ + ჩატი). სუფთა დირექტორია (Soliguide, Findhelp) ინდუსტრიულ განახლების აპარატს მოითხოვს — GrantKit-ს ეს არ აქვს.
6. **[შეფასება]** GrantKit-ის უნიკალური აქტივი არა მოცულობა (624 FR ორგანიზაცია vs Soliguide-ის 27,600), არამედ **„შემიძლია თუ არა ამ სერვისით სარგებლობა?" სიგნალები** (უსტატუსო, დაუზღვეველი, ფასი, ენები, ჩაწერის პოლიტიკა, Google rating) + **მრავალქვეყნიანობა** + **ka/ru** + **AI assistant**. Soliguide-საც აქვს publics/conditions ფილტრები [21], მაგრამ მხოლოდ საფრანგეთისთვის და ქართულის გარეშე.
7. **[ფაქტი]** AI assistant-ის მიმართულება ვალიდირებულია სექტორის ლიდერის მიერ: Signpost AI (IRC/Mercy Corps) RAG ~30,000 გადამოწმებულ სტატიაზე, 6–8 ქვეყანაში პილოტი, Claude შერჩეული უსაფრთხოებისთვის, მაგრამ **მხოლოდ human-in-the-loop** [22][23]. **[შეფასება]** GrantKit-ის AI-ს პირდაპირ end-user-თან გაშვება იურიდიული რისკია — საჭიროა guardrails.
8. **[ფაქტი]** სპონსორული/B2B2C მოდელები ამ სივრცეში მუშაობს: Arrive (Canada) — RBC ბანკის მიერ დაფინანსებული უფასო აპი [24]; Expatica — ads + affiliate + directory listings, low-mid single-digit $M შემოსავალი [25]; Integreat — €4,000–15,000/წ თითო მუნიციპალიტეტიდან [6]; Findhelp — $304M VC, ყიდის health systems-ზე, საჯაროდ უფასო [26][27].
9. **[შეფასება]** რეკომენდებული პოზიციონირება: **„ინტეგრაციის ნავიგატორი ქართველი (და რუსულენოვანი) ემიგრანტებისთვის ევროპასა და აშშ-ში"** — ენა-first, niche-first; შემოსავალი Helper-Pro (სოცმუშაკები, დიასპორის მოხალისეები, ოჯახი სამშობლოში) + B2B2C (დიასპორის ორგანიზაციები, საელჩოები, NGO-ები) + პლატფორმის გრანტები (AMIF, Google.org, DIAIR inclusion numérique, MFA-ს „დიასპორული ინიციატივების ხელშეწყობა").
10. **[ფაქტი/რისკი]** Landing page-ი ამტკიცებს „500+ Active members" და 3 testimonial-ს (`en.ts` L101–107), მაშინ როცა `users` ცხრილი 2026-04-23-ზე ცარიელი იყო (ORG-CENTRIC-MEMORY §2.2); subscription funnel-ს აქვს CRITICAL premium-bypass (audit #12). **[შეფასება]** მოწყვლადი აუდიტორიის trust-ს ეს უფრო აზიანებს, ვიდრე ნებისმიერი კონკურენტი.

---

## 2. პლატფორმების პროფილები

### 2A. საჯარო / NGO newcomer-information პლატფორმები

| პლატფორმა | აუდიტორია & სტატუსი | გეოგრაფია | ენები | კონტენტ-მოდელი | ვინ/როგორ ინახავს | დაფინანსება | ტრაქცია (წყარო) |
|---|---|---|---|---|---|---|---|
| **Réfugiés.info** (FR) | ლტოლვილები, BPI, აგრეთვე მათი დამხმარეები; დემარშები 10 თემაზე | საფრანგეთი, დეპარტამენტული ფილტრი | 8: fr, uk, ps, en, fa, ti, ru, ar [1] | **ჰიბრიდი**: démarches (პროცედურები) + fiches actions (სტრუქტურების პროგრამები); web + iOS/Android | DIAIR → La MedNum; 950 კონტრიბუტორი (სტრუქტურები თავად წერენ), მოხალისე მთარგმნელები [2][28] | სახელმწიფო (DIAIR, beta.gouv/DINUM); €0.60/ინფორმირებული ადამიანი 2025 [2] | 1M+ unique visitors 2024 (ორმაგდება ყოველწლიურად), ~1,000 fiche, 150k app downloads 2024 [2] |
| **Soliguide** (FR, Solinum) | ყველა პრეკარიულ მდგომარეობაში მყოფი (უსახლკარო, უსტატუსო, თავშესაფრის მაძიებელი) | 40+ დეპარტამენტი, მიზანი — ეროვნული 2026 [3] | 8 (fr, en, ar, es დადასტურებული; დანარჩენი unverified) [14] | **სუფთა დირექტორია**: ადგილი → სერვისები, საათები, publics accueillis, conditions d'accès (RDV/გარეშე, უფასო/ფასიანი) [21] | ლოკალური Solinum გუნდები + ამბასადორები; API/widget პარტნიორებისთვის; open source (GitHub) [14][29] | სახელმწიფო + collectivités + ფონდები (Crédit Mutuel €10k/ტერიტორია), FEDER Interreg, France Active [29][30] | 27,600 სტრუქტურა / 98,000 სერვისი; 3.7M ძიება 2024 (+95% vs 2022) [3][4] |
| **Watizat** (FR) | ექსილები ქუჩაში/ბანაკებში, პირველი დღეები | პარიზი, Oise, ლიონი, ტულუზა [31] | პარიზი: fr, en, ar, ps, prs, uk; ლიონი: fr, en [31] | **ბეჭდური გიდი** (PDF-იც) — მისამართები + პროცედურები, ყოველთვიური | მოხალისეები; 1,400 გიდი/თვე ბეჭდვა [31] | ასოციაცია, დონაციები (HelloAsso); ბიუჯეტი unverified | ტირაჟი 1,400/თვე [31] |
| **Integreat** (DE, Tür an Tür Digitalfabrik) | ყველა ახალჩამოსული, მუნიციპალურ დონეზე | ~140 გერმანული ქალაქი/Landkreis [5] | თითო მუნიციპალიტეტში 12–13 (Augsburg 12, SÜW 13) [5] | **მუნიციპალური CMS** (WordPress-based): პროცედურები + ლოკალური POIs + events; offline | ლოკალური მუნიციპალური რედაქტორები; Digitalfabrik — ცენტრალური IT [6] | **B2G**: €4,000–15,000/წ თითო კომუნა; open source (MIT/Apache); Google.org Impact Challenge €250k (2018) [6][5] | 140 კომუნა; TUM-თან შექმნილი 2015 [5] |
| **Handbook Germany : Together** (DE, NdM) | არა-EU წარმოშობის, დარჩენის პერსპექტივით | გერმანია (ფედერალური) | 9: ar, en, de, fa, fr, ps, tr, ru, uk [7] | **გიდები + პირველადი კონსულტაცია + Community** (peer-to-peer რედაქცია) | რედაქცია მიგრაციული გამოცდილებით; პარტნიორები IQ, BMAS, Pro Asyl, IOM [7] | EU AMIF €9M (2023–25) + BMI €300k/წ [7] | „რამდენიმე მილიონი page view წელიწადში" [32]; ევალუაცია 2025 |
| **Ankommen App** (DE) | თავშესაფრის მაძიებლები პირველ კვირებში | გერმანია | 5: ar, en, fa, fr, de; offline [33] | **სახელმძღვანელო + გერმანულის კურსი** (multimedia) | BAMF, BA, Goethe-Institut, BR | ფედერალური | Downloads unverified |
| **Germany4Ukraine** (DE, BMI) | უკრაინელი ლტოლვილები | გერმანია | uk, ru, en, de; app [34] | **პროცედურები + 4 ონლაინ ადმინ. სერვისი** (eID, ინტეგრაციის კურსი, უმუშევრობა) | BMI, 10 დღეში აშენდა; user-lab აპრილი 2022 [34] | AMIF (2023-12 → 2025-02) [7] | Users unverified |
| **USAHello / FindHello** (US) | ლტოლვილები, იმიგრანტები, თავშესაფრის მაძიებლები, **უსტატუსოები** | აშშ | 7: ar, zh, fa/prs, fr, ps, es, vi [8] | **ჰიბრიდი**: ინფო-hub + კლასები + FindHello დირექტორია (6,000 რესურსი, სტატუს-ფილტრი, offline, Google Maps) [8][35] | NGO რედაქცია; FindHello UNHCR-თან | 501(c)3; 2024 შემოსავალი $904k (94.5% შემოწირულობა), ხარჯი $1.21M [9] | 3.5M ადამიანი 2024; FindHello ~60k users 2022 [8] |
| **Welcome.US / Welcome Connect** (US) | სპონსორები ↔ პაროლის მაძიებლები (UA, CU, HT, NI, VE) | აშშ | en (+?) unverified | **Matching platform** + სპონსორის სახელმძღვანელოები | NGO; Goldman Sachs/ServiceNow/Infosys build [36] | Tech for Refugees (Breakthrough Prize), კორპორაციები | 2,400 matched; „500k newcomer welcomed" (ekosistema) [36] |
| **Settle In (CORE/IRC)** (US) | resettled ლტოლვილები (R&P) | აშშ | 7: ar, my, prs, en, rw, sw, ru; Navigator 9 [15] | **Cultural orientation**: ვიდეო, ქვიზები, 2-way messaging (7 ენა, 1 business day) | IRC CORE გუნდი | **US State Dept PRM** [37] | FB 35k followers, 1.2M reach (2024-08) [37] |
| **Signpost / Refugee.Info** (IRC + Mercy Corps) | ლტოლვილები ტრანზიტში/ჩამოსვლისას | 20 ქვეყანა [16] | 25 [16] | **სტატიები + service maps + მოდერირებული Q&A სოციალურ ქსელებში + AI assistant (HITL)** | ლოკალური რედაქციები; ~30k fact-checked სტატია RAG-ში [22] | IRC/Mercy Corps + Google, Microsoft, Cisco, TripAdvisor, Tech for Refugees [38] | 1M reach 2018; AI პილოტი 6–8 ქვეყანა [16][23] |
| **help.unhcr.org** | ლტოლვილები/თავშესაფრის მაძიებლები | ქვეყნის ქვე-საიტები (მათ შორის Georgia, Spain, Germany) | ლოკალურად შერჩეული | **პროცედურები + FAQ + საკონტაქტო** | UNHCR ქვეყნის ოფისები + პარტნიორები [39] | UN | unverified |
| **IOM MigApp** | მიგრანტები მოგზაურობაში | 180+ ქვეყნის სავიზო/ჯანდაცვის რეგულაცია | 8: en, ar, fr, es, zh, it, ru, pt [40] | **Utility app**: რეგულაციები, დოკუმენტების საცავი, მთარგმნელი, AVRR ინფო | IOM | UN | unverified |
| **Settlement.org** (Ontario, OCASI) | ახალჩამოსულები ონტარიოში | ონტარიო | en/fr + ზოგი რესურსი 30+ ენაზე [41] | **გიდები + მოდერირებული ფორუმი** (I&R specialists პასუხობენ) | OCASI რედაქცია | IRCC + Ontario MCIIT [41] | unverified |
| **Arrive** (Canada, RBC Ventures) | ახალჩამოსულები pre-arrival → settling | კანადა | en (fr?) unverified | **სოციალური ქსელი + checklists + webinars + ambassador** | RBC | **ბანკის სპონსორობა** (client acquisition) [24] | unverified |
| **Migrant Help** (UK) | თავშესაფრის მაძიებლები | UK | ტელეფონით მრავალენოვანი | **Helpline 24/7 + AIRE service**, არა პლატფორმა | ქველმოქმედება | Home Office კონტრაქტი £235M / 10 წ (2019–29) [42] | KPI-ზე დაფუძნებული |
| **Refugee Council** (UK) | ლტოლვილები, RCO-ები | UK | en | სერვისები + Funding Toolkit (funder finder RCO-ებისთვის) [43] | ქველმოქმედება | ტრასტები, სახელმწიფო | — |
| **Dopomoha** (RO, Code for Romania) | უკრაინელი ლტოლვილები | რუმინეთი | ro, uk, en, ru [44] | **პროცედურები**, ყოველდღიური განახლება ოფიციალური პარტნიორებიდან | Code for Romania + MAI + UNHCR + IOM | civic-tech, პარტნიორები | 1.4M ვიზიტორი; 48 საათში აშენდა [44] |
| **Ukraine Take Shelter** | უკრაინელები ↔ hosts | გლობალური | 15 [45] | **Listings matching** | 2 სტუდენტი | ვოლონტარული | 1M+ users, 4,000 listings პირველ კვირაში [45] |
| **CEAR / Accem / Cruz Roja „Migrar"** (ES) | თავშესაფრის მაძიებლები | ესპანეთი, პროვინციული | es + გლოსარიუმი (bm, snk, wo, ar, fr) [46] | **ოფლაინ სერვისები**; ვებზე გიდები/ბმულები; ძლიერი ციფრული პლატფორმა **არ არსებობს** | NGO | სახელმწიფო კონტრაქტები (რეცეფცია) | — |
| **EWSI → Migrant Integration Hub** (EU, DG HOME) | **პოლიტიკოსები, პროფესიონალები**, არა მიგრანტები | 27 EU ქვეყანა | en | **პოლიტიკის/პრაქტიკის ბაზა**, country coordinators (MPG) [47] | MPG + 27 ეროვნული კოორდინატორი | EC | 2025-05 relaunch [47] |
| **InfoMigrants** (FMM + DW + ANSA) | მიგრანტები წარმოშობის/ტრანზიტის ქვეყნებში | გლობალური | fr, en, ar, ps, prs, bn [48] | **ახალი ამბები** (ჟურნალისტიკა), არა დირექტორია | სამი public broadcaster | EU co-funding (46% საწყისი €2.4M) [48] | 37M users/წ [48] |

**[შეფასება — ჯგუფი A]** სამი ტიპი: (1) *ეროვნული ჰიბრიდები* (Réfugiés.info, Handbook Germany, USAHello) — სახელმწიფოს/EU-ს ფულით, ეროვნული ბრენდით, საკუთარ ქვეყანაში დაუმარცხებელი; (2) *მუნიციპალური CMS* (Integreat) — B2G, გერმანიის გარეთ თითქმის არ არის; (3) *კრიზისული one-off* (Germany4Ukraine, Dopomoha, UTS) — სწრაფი, ერთ-ეროვნებაზე, ხშირად ჩერდება. არცერთი არ არის **მრავალქვეყნიანი + ორგანიზაცია-ცენტრული + ka/ru**.

### 2B. სერვის-დირექტორიები / benefits

| პლატფორმა | აუდიტორია | გეოგრაფია | ენები | კონტენტ-მოდელი | ვინ ინახავს | ბიზნეს-მოდელი | ტრაქცია |
|---|---|---|---|---|---|---|---|
| **Findhelp.org** (US) | ყველა, ვინც social care-ს ეძებს; B2B — health systems, gov, CBOs | აშშ, ყოველი ZIP | en, es (+?) | **დირექტორია**: 300,000+ პროგრამა; closed-loop referrals, screening, outcomes [27] | კომპანიის data team + პროვაიდერების claim | **B2B SaaS** (health payers/providers, gov); საჯარო ძიება უფასო; $304M raised (Rise Fund) [26] | #1 KLAS SDoH 2022; Uno Health acquisition 2025-10 [26] |
| **211** (United Way) | ყველა | აშშ/კანადა, 200+ ცენტრი | ტელეფონით მრავალენოვანი | **I&R helpline + ლოკალური ბაზები** | ლოკალური 211 ცენტრები | United Ways, ფონდები, ლოკალური მთავრობა [49] | 16.8M მოთხოვნა 2024, 18M referral [49] |
| **Turn2us** (UK) | სიღარიბეში მყოფი ფიზიკური პირები; intermediaries | UK | en | **გრანტების დირექტორია (~1,700) + Benefits Calculator + PIP helper** [13] | ქველმოქმედების გუნდი; ფონდები თავად რეგისტრირდებიან უფასოდ [50] | **ქველმოქმედება**: £2.34M voluntary income + £5.4M Elizabeth Finn Homes subsidiary; org licence £100+VAT [13][51] | 971k grant searches, 2.4M benefit calcs, 4.8M ვიზიტორი [13] |
| **Benefits.gov → USA.gov** | მოქალაქეები | აშშ | en, es | **Benefit finder** (1,000+ პროგრამა); 2024-10-ში USA.gov-ში გადავიდა, ფილტრები კითხვარის ნაცვლად [52] | GSA/DOL | ფედერალური | — |

**[შეფასება — ჯგუფი B]** Turn2us არის GrantKit-ის „წარმოშობის კატეგორიის" გამარჯვებული და ის *უფასოა*, რადგან ბენეფიციარი ვერ იხდის. Findhelp აჩვენებს, ვინ იხდის დირექტორიისთვის: ის, ვისაც referral-ის შედეგი უღირს (ჯანდაცვის სისტემა, მუნიციპალიტეტი), არა მომხმარებელი.

### 2C. Grant-directory SaaS (კონტრასტისთვის)

| პლატფორმა | ვინ ყიდულობს | ფასი | რას ყიდის |
|---|---|---|---|
| **GrantWatch** | NGO, ბიზნესი, **ფიზიკური პირები** (ერთი ფასი ყველასთვის) | $22/კვირა, $49/თვე, $100/კვარტ., $249/წ [10] | 11,900+ human-verified გრანტი; lifecycle tools |
| **Instrumentl** | NGO-ები, grant consultants | $299–$999/თვე (annual), 14-დღიანი trial [11] | discovery + tracking + AI |
| **Candid FDO** | NGO fundraisers | Essential $54.99/თვე ($449/წ); Professional $219.99/თვე (~$1,599/წ) [12] | ფონდების პროფილები + grant history |

**[შეფასება — ჯგუფი C]** ეს ბაზარი მუშაობს, რადგან მყიდველი ინსტიტუციაა და ROI ითვლის: $249/წ სუბსკრიფცია ერთი $5k გრანტით ამორტიზდება. ემიგრანტისთვის, რომელიც უსტატუსოა და უფასო ექიმს ეძებს, ეს ლოგიკა არ არსებობს. GrantKit-ის $9/თვე არის GrantWatch-ის ლოგიკის „დისკონტირებული" ვერსია არასწორ აუდიტორიაზე.

### 2D. ქართული და რუსულენოვანი ემიგრანტული რესურსები

| რესურსი | ვინ | აუდიტორია | კონტენტი | ინტეგრაციის ინფო უცხოეთში? | ტრაქცია |
|---|---|---|---|---|---|
| **migration.commission.ge** (SCMI) | იუსტიციის სამინისტრო (თავმჯდომარე) + MIA; სამდივნო EU-ის მხარდაჭერით [18] | პოლიტიკოსები, მკვლევრები, პოტენციური მიგრანტები | მიგრაციის სტრატეგია, Migration Profile, „Guidebook on Legal Immigration" (PDF) [18] | **არა** — ლეგალური მიგრაციის *წინ* ინფო, არა ჩამოსვლის *შემდეგ* | unverified |
| **gda.ge** | MFA-ს დიასპორასთან ურთიერთობის დეპარტამენტი [17] | დიასპორა, დაბრუნებულები | საკონსულტაციო ცენტრი, დოკუმენტების მიღება ჩამოუსვლელად, რეინტეგრაციის გზამკვლევი, „დიასპორული ინიციატივების ხელშეწყობა" გრანტი, დიასპორული ორგანიზაციების სია, მისიების ცხელი ხაზი [17][53] | **ნაწილობრივ** — საკონსულო/დაბრუნება; არა „სად ვიპოვო უფასო ექიმი პარიზში" | unverified |
| **emigrantebi.org / emigrantebi.ge** | კერძო ბლოგი/მედია, გვერდზე ტელეფონები + თარგმნის სერვისი (WeTranslate) [54] | ქართველი ემიგრანტები | ახალი ამბები, ვიდეო („როგორ მოვხვდეთ მექსიკიდან ამერიკაში"), დამოწმებული თარგმანის რეკლამა | **არასტრუქტურირებული**; კომერციული თარგმანი — ბიზნეს-მოდელის მინიშნება | unverified |
| **Facebook ჯგუფები**: „ქართველი ემიგრანტები", „Georgian Immigrants in USA", „ემიგრანტები იტალიაში / LA MIA GEORGIA", „ქართველი ემიგრანტები ნაპოლში", „ასოციაცია ქართველები საფრანგეთში / Géorgiens en France" [55][56] | თემი | ემიგრანტები ქვეყნების მიხედვით | Q&A, რჩევები, ვაკანსიები („1+1 ვაკანსია უანგაროდ") | **კი, მაგრამ community-only**: არ იძებნება, არ ვერიფიცირდება, ქრება feed-ში | წევრთა რაოდენობა unverified (FB დაბლოკილი) |
| **დიასპორული ორგანიზაციები FR**: ასოციაცია „ლაზი" (2009), წმ. თამარ მეფის ტაძარი (საკვირაო სკოლა, გუნდი) [57] | NGO/ეკლესია | ქართველები საფრანგეთში (~35k MFA შეფასება [56]) | კულტურა, იდენტობა | **არა** — არა ინტეგრაციის ინფო | — |
| **Kovcheg / Ковчег** (kovcheg.live) | ანტისამხედრო რუსული ემიგრაცია; „უცხოური აგენტი" RF-ში 2023-12 [58] | რუსები, 70 ქვეყანა [59] | **База знаний** (country cards, ВНЖ გიდები, ჩეკ-ლისტი), ვებინარები, ბოტი, ფსიქოლოგები, თავშესაფარი; ოფისები Istanbul, Yerevan, Warsaw, Astana [58][59] | **კი, რუსულად**, მაგრამ პოლიტიკურად პოზიციონირებული; ქართველებისთვის — არა | 2026-08: ბოტზე კითხვები ×6.3 vs მაისი [59]; დონაციები (33.5k€ + $14.5k პირველ თვეში 2022) [60] |
| **Reforum Space** (Free Russia Foundation) | ანტისამხედრო რუსები/ბელარუსები/უკრაინელები | Berlin, Budva, Warsaw, Vilnius, **Paris, Tbilisi**, Tallinn [61] | უფასო coworking, ივენთები (900+/წ), კონსულტაცია, ენის კურსები | **ოფლაინ ჰაბები**, არა ინფო-პლატფორმა | 100+ რეზიდენტი პროექტი [61] |
| **Telegram „ЭМИГРАНТЫ 360°" / @forum_europa** | კერძო | რუსულენოვანი 150+ ქვეყანაში | 1,200+ ჩატი TG/WhatsApp, ~400 VK/FB ჯგუფი [62] | **Community**, არავერიფიცირებული | — |

**[შეფასება — ჯგუფი D]** **არ არსებობს არცერთი პლატფორმა**, რომელიც ქართულენოვან ემიგრანტს სტრუქტურირებულ, ძიებად, ვერიფიცირებულ ინტეგრაციის ინფორმაციას აძლევს ჩამოსვლის ქვეყანაში. სახელმწიფო ხედავს ემიგრანტს როგორც *დაბრუნების* ობიექტს; დიასპორა — როგორც *კულტურის* მატარებელს; Facebook — როგორც კითხვის ავტორს. რუსულენოვან სივრცეში Kovcheg ძლიერია, მაგრამ (ა) პოლიტიკური ბრენდი, (ბ) წარმოშობა-ცენტრული (რუსების უფლებები), არა ორგანიზაცია-ცენტრული.

---

## 3. Feature matrix

✓ = აქვს · ◐ = ნაწილობრივ · ✗ = არა · ? = unverified

| პლატფორმა | რუკა | ფილტრები | „შემიძლია?" სიგნალი (სტატუსი/ფასი/RDV) | პროცედურები/გიდები | ორგ. დირექტორია | Community Q&A | Offline | Native app | Chat/AI | პერსონალიზაცია | Checklist | Save/Alerts | ლოკალური რედაქტორის CMS | მრავალ-ქვეყანა | ka | ru |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Réfugiés.info | ◐ (დეპ. ფილტრი) | ✓ | ◐ (სტატუსი/ასაკი fiche-ზე) | ✓ | ✓ (fiches actions) | ✗ | ◐ | ✓ | ✗ | ✓ (parcours) | ◐ | ✓ | ✓ (სტრუქტურები თავად) | ✗ | ✗ | ✓ |
| Soliguide | ✓ | ✓ | **✓** (publics, RDV, უფასო/ფასიანი, PMR) | ✗ | ✓ | ✗ | ◐ (PDF) | ✓ | ◐ (messaging) | ✗ | ✗ | ✗ | ✓ (ლოკალური გუნდები) + API | ◐ (ES პილოტი ?) | ✗ | ? |
| Watizat | ✗ | ✗ | ◐ (ტექსტში) | ✓ | ✓ (მისამართები) | ✗ | ✓ (ქაღალდი) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Integreat | ✓ (POIs) | ◐ | ◐ | ✓ | ✓ | ✗ | ✓ | ✓ | ◐ (chat პილოტი ?) | ◐ (ქალაქი) | ✗ | ◐ (push) | **✓** (მუნიციპალური) | ✗ | ? | ✓ (ტიპიურად) |
| Handbook Germany | ✗ | ◐ | ✗ | ✓ | ◐ (ბმულები) | ✓ | ✗ | ✗ | ◐ (კონსულტაცია) | ✗ | ✗ | ✗ | ✗ (ცენტრალ. რედაქცია) | ✗ | ✗ | ✓ |
| Ankommen | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Germany4Ukraine | ✗ | ◐ | ✗ | ✓ | ◐ | ✗ | ? | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| USAHello/FindHello | ✓ | ✓ | **✓** (immigration status incl. undocumented) | ✓ | ✓ (6,000) | ✗ | ✓ | ✓ | ✗ | ◐ | ◐ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Welcome.US | ✗ | ◐ | ✗ | ✓ (sponsor guides) | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ (matching) | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Settle In | ✗ | ✗ | ✗ | ✓ (video) | ✗ | ◐ (2-way msg) | ✓ | ✓ | ◐ (human) | ✗ | ✓ (quiz) | ✗ | ✗ | ✗ | ✗ | ✓ |
| Signpost | ✓ (service maps) | ✓ | ◐ | ✓ | ✓ | ✓ (moderated social) | ✗ | ◐ | **✓ (AI, HITL)** | ✗ | ✗ | ✗ | ✓ (ქვეყნის რედაქციები) | **✓ (20)** | ✗ | ◐ |
| help.unhcr.org | ✗ | ✗ | ✗ | ✓ | ◐ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ (country offices) | ✓ | ✗ (GE საიტი en/ka ?) | ◐ |
| IOM MigApp | ✗ | ✗ | ✗ | ◐ (regulations) | ✗ | ✗ | ◐ | ✓ | ◐ (translator) | ✓ (country page) | ✗ | ✓ (alerts) | ✗ | ✓ (180+) | ✗ | ✓ |
| Settlement.org | ✗ | ◐ | ✗ | ✓ | ◐ | **✓** (moderated forum) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ◐ (რესურსები) |
| Arrive (RBC) | ✗ | ✗ | ✗ | ✓ | ✗ | ✓ (peer match) | ✗ | ✓ | ✗ | ✓ | **✓** | ✗ | ✗ | ✗ | ✗ | ✗ |
| Findhelp | ✓ | ✓ | ◐ (eligibility ტექსტი) | ✗ | **✓ (300k)** | ✗ | ✗ | ◐ | ✗ | ◐ (screening B2B) | ✗ | ✓ | ✓ (providers claim) | ✗ | ✗ | ✗ |
| Turn2us | ✗ | ✓ | ✓ (eligibility criteria) | ✓ | ✓ (1,700 grants) | ✗ | ✗ | ✗ | ✗ | ✓ (calculator) | ✗ | ◐ | ✓ (funders self-register) | ✗ | ✗ | ✗ |
| Kovcheg | ✗ | ✗ | ✗ | ✓ (country cards) | ◐ (chats map) | ✓ (chats) | ✗ | ✗ | ✓ (bot, human) | ✗ | ✓ | ✗ | ✗ | ✓ (70) | ✗ | ✓ |
| gda.ge | ✗ | ✗ | ✗ | ◐ (რეინტეგრაცია) | ◐ (დიასპ. ორგ.) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ◐ | ✓ | ✗ |
| **GrantKit (დღეს)** | ✓ | ✓ | **✓** (undocumented, uninsured, ფასი, ენები, RDV, Google rating) | **✗** | ✓ (~1,100 org / 624 FR) | ✗ | ✗ | ✗ (PWA ?) | ✓ (RAG-ის გარეშე — direct DB queries) | ◐ (onboarding + dashboard) | ✗ | ◐ (save ✓, alerts = newsletter) | ✗ (admin-only) | ✓ (29) | **✓** | **✓** |

**[შეფასება]** მატრიცაში GrantKit-ის უნიკალური კომბინაცია ორი სვეტია: „შემიძლია?" სიგნალი × მრავალ-ქვეყანა × ka. ყველაზე დიდი ხვრელი — **პროცედურები ✗** და **ლოკალური რედაქტორის CMS ✗**: დირექტორია გიდების გარეშე ემიგრანტს „სად"-ს ეუბნება, „როგორ"-ს არა, ხოლო რედაქტორის გარეშე 1,100 ორგანიზაცია 12 თვეში მოძველდება.

---

## 4. კონტენტ-მოდელების შედარება

| მოდელი | რისთვის კარგია | შენახვის ღირებულება | ვინ იყენებს | მარცხის რეჟიმი |
|---|---|---|---|---|
| **პროცედურები/გიდები** („როგორ ავიღო titre de séjour") | პირველი 90 დღე; ნდობის აშენება; SEO; AI-ს ცოდნის ბაზა | **საშუალო**: 50–200 ტექსტი ქვეყანაზე, იცვლება კანონთან ერთად (წელიწადში 1–3 დიდი ცვლილება); თარგმანი × ენები | Réfugiés.info (démarches), Handbook Germany, Ankommen, Kovcheg (cards), Germany4Ukraine, help.unhcr.org | მოძველებული პროცედურა = იურიდიული ზიანი; საჭიროა „ბოლო შემოწმება" თარიღი |
| **ორგანიზაციების დირექტორია** („სად") | „ახლა მჭირდება ექიმი/საწოლი"; რუკა; ლოკალური ღირებულება | **მაღალი და ხაზობრივი**: Soliguide-ს ლოკალური გუნდები + ამბასადორები სჭირდება 27k სტრუქტურაზე; Findhelp-ს data team + providers claim; საათები/ტელეფონები იცვლება თვეებში | Soliguide, Findhelp, FindHello, Integreat POIs, Turn2us | „დაკეტილი კარი": მომხმარებელი მიდის, სერვისი აღარ არსებობს — ნდობა ერთხელ იკარგება |
| **Community Q&A** | Long-tail კითხვები; ემოციური მხარდაჭერა; უფასო კონტენტი | **დაბალი ფული, მაღალი მოდერაცია**; იურიდიული რისკი (UK IAA: იმიგრაციული რჩევა რეგულირებულია [63]) | Settlement.org (moderated by I&R specialists), Handbook Germany, Signpost (social), FB ჯგუფები, Telegram | დეზინფორმაცია; „ჩემი ბიძაშვილის" რჩევა; მოდერატორის burnout |
| **Benefits/eligibility matching** | „რა მეკუთვნის" | მაღალი ექსპერტიზა (წესების ძრავა) | Turn2us calculator, Benefits.gov, Findhelp screening | წესების ცვლილება = შეცდომითი შედეგი |

**[ფაქტი]** გამარჯვებულების კომბინაცია: Réfugiés.info = *პროცედურები + დირექტორია* (სტრუქტურები თავად წერენ თავიანთ fiche-ებს — 950 კონტრიბუტორი) [2]; Integreat = *პროცედურები + POIs*, მაგრამ შენახვის ტვირთი მუნიციპალიტეტზეა გადატანილი (და ისინი ამაში €4–15k-ს იხდიან) [6]; Signpost = *სტატიები + service map + მოდერირებული social + AI* [22]; USAHello = *გიდები + FindHello დირექტორია* [8].

**[შეფასება]** GrantKit-ს აქვს მხოლოდ დირექტორია — ყველაზე ძვირი მოდელი შენახვისთვის — და ის ინახავს ერთი ადმინი + LLM-enrichment. ეს არ სკალირდება Soliguide-ის დონეზე. რეალისტური გზა: (1) **დაამატე თხელი პროცედურული ფენა** ქვეყანაზე 20–40 გიდით ქართულად/რუსულად (ეს არავის აქვს); (2) **გახსენი claim/edit** ორგანიზაციებისთვის და დიასპორის მოხალისეებისთვის (Réfugiés.info/Findhelp მოდელი) — ეს ერთადერთი გზაა, რომ 1,100 ჩანაწერი ცოცხალი დარჩეს; (3) **პრიორიტეტი სიღრმეზე და არა სიგანეზე**: 624 FR ორგანიზაცია „შემიძლია?" სიგნალებით უფრო ღირებულია, ვიდრე 29 ქვეყანა ზედაპირულად.

---

## 5. ბიზნეს-მოდელის ანალიზი

### 5.1 ვინ იხდის და რატომ (ფაქტები)

| ვინ იხდის | პრეცედენტი | თანხა | რატომ იხდის |
|---|---|---|---|
| **სახელმწიფო** | Réfugiés.info (DIAIR/DINUM) [2]; Migrant Help (£235M/10წ) [42]; Settle In (PRM) [37]; Settlement.org (IRCC) [41] | — / £23.5M/წ | პოლიტიკის მანდატი; „€0.60 თითო ინფორმირებული" — ღირებულება/ეფექტიანობა |
| **EU ფონდები** | Handbook Germany AMIF €9M (2023–25) [7]; Germany4Ukraine AMIF [7]; InfoMigrants 46% EU [48]; Soliguide FEDER [30] | €3M/წ | ინტეგრაციის პრიორიტეტი |
| **მუნიციპალიტეტები (B2G)** | Integreat €4–15k/წ თითო კომუნა [6]; Soliguide collectivités [29] | 140 × ~€8k ≈ €1.1M/წ (ჩემი გამოთვლა) | ლოკალური ინტეგრაციის ვალდებულება; ბეჭდური გიდების ჩანაცვლება |
| **ჯანდაცვის სისტემები / payers (B2B)** | Findhelp $304M VC, ყიდის SDoH ინფრასტრუქტურას [26] | — | closed-loop referrals აქვეითებს ხარჯებს |
| **ფონდები / Big Tech** | Integreat Google.org €250k [5]; Signpost — Google, Microsoft, Cisco, TripAdvisor, Tech for Refugees [38]; Welcome Connect — Tech for Refugees [36]; Soliguide — Crédit Mutuel €10k/ტერიტორია [29] | — | CSR, impact |
| **ქველმოქმედება/დონორები** | USAHello $854k შემოწირულობა (94.5%) [9]; Turn2us £2.34M + £5.4M subsidiary [13]; Kovcheg 33.5k€+$14.5k/თვე (2022) [60] | — | მისია |
| **კომერციული სპონსორი** | Arrive — RBC [24]; Expatica — ads/affiliate/directory listings, low-mid $M [25]; emigrantebi.ge — თარგმნის სერვისი [54] | — | client acquisition (ბანკი, დაზღვევა, remittance, თარგმანი) |
| **ინსტიტუციური subscriber** | GrantWatch $249/წ [10]; Instrumentl $299+/თვე [11]; Candid $449+/წ [12]; Turn2us intermediary licence £100+VAT [51] | — | ROI: ერთი გრანტი ამორტიზებს |
| **ინდივიდუალური subscriber** | InterNations Albatross (3M+ წევრი, 420 ქალაქი) — ფასი unverified [64]; GrantWatch (იგივე ფასი ინდივიდისთვის) [10] | — | ივენთებზე დაშვება (InterNations) — *ექსპატები*, არა ლტოლვილები |

### 5.2 არის თუ არა $9/თვე B2C სიცოცხლისუნარიანი? — **[შეფასება: არა, როგორც ძირითადი მოდელი]**

- **Substitute უფასოა და სახელმწიფო-ბრენდირებული.** საფრანგეთში Réfugiés.info + Soliguide, გერმანიაში Integreat + Handbook Germany, აშშ-ში Findhelp + USAHello — ყველა უფასო, მრავალენოვანი, ეროვნული ხილვადობით. Paywall-ის უკან GrantKit-ის 624 FR ორგანიზაცია Soliguide-ის 27,600-ს ვერ დაუპირისპირდება.
- **მყიდველს ფული არ აქვს.** სამიზნე — თავშესაფრის მაძიებელი (ADA ≈ €6.8/დღე FR-ში — ჩემი ცოდნა, unverified ამ კვლევაში), უსტატუსო, დაუზღვეველი. $9 = დღიური შემწეობა+. ეთიკურადაც პრობლემურია გადაუდებელი სამედიცინო ინფოს paywall.
- **პრეცედენტი ფასიანი მოდელისა მხოლოდ ინსტიტუციურია.** GrantWatch/Instrumentl/Candid — ორგანიზაციები. InterNations — ექსპატები, ღირებულება ივენთებია, არა ინფო.
- **Turn2us — ზუსტად GrantKit-ის წარმოშობის კატეგორია — უფასოა** და 4.8M ვიზიტორს ქველმოქმედების ფულით ემსახურება [13].
- **კოდის სიგნალი:** ვინც სცადა გადახდას, `subscription.activate` bypass-ით უფასოდ შედის (audit #12). ფაქტობრივად პროდუქტი დღესაც უფასოა, უბრალოდ ცუდი UX-ით.

### 5.3 ალტერნატიული / დამატებითი მოდელები

| # | მოდელი | აღწერა | პრეცედენტი | Pros | Cons |
|---|---|---|---|---|---|
| **M1** | **Free core + „Helper Pro"** | ემიგრანტისთვის 100% უფასო. Pro ($9–29/თვე ან €99/წ) *დამხმარეებისთვის*: სოცმუშაკები, დიასპორის მოხალისეები, ადვოკატები, ოჯახის წევრები საქართველოში — case lists, print packs (Watizat-სტილი), share-ბმულები, AI კონსულტაცია მრავალ კლიენტზე, CSV export | Turn2us adviser accounts (£100+VAT) [51]; Réfugiés.info „aidants" აუდიტორია [1] | ეთიკური; მყიდველს აქვს ბიუჯეტი; შენარჩუნებულია Paddle ინფრასტრუქტურა | მცირე TAM; საჭიროა helper-features, რომლებიც არ არსებობს |
| **M2** | **B2B2C ლიცენზია / white-label** | დიასპორის ორგანიზაციები, საელჩოები (gda.ge საკონსულტაციო ცენტრი), NGO-ები (CEAR, Accem, Comede), მუნიციპალიტეტები — embed widget/API, ბრენდირებული ქვე-საიტი, ka/ru ფენა მათი კონტენტისთვის. €2–10k/წ | Integreat €4–15k/კომუნა [6]; Soliguide API/widget [29]; Turn2us embed [51] | განმეორებადი შემოსავალი; დისტრიბუცია ნდობის არხით; კონტენტის თანა-შენახვა | გრძელი sales cycle; საჯარო შესყიდვები; საქართველოს პოლიტიკური კონტექსტი — საელჩოსთან თანამშრომლობა რეპუტაციულად სენსიტიურია |
| **M3** | **Sponsorship + referral partners** | remittance (Wise/Remitly), mutuelle/დაზღვევა, დამოწმებული თარგმანი, ადვოკატები, SIM/ბანკი — ღიად მონიშნული „პარტნიორის" ბლოკები; CPA/affiliate | Arrive/RBC [24]; Expatica (Wise-ის მიერ შეძენა 2026-06 — reported, unverified) [25]; emigrantebi.ge თარგმანი [54] | სწრაფი ფული; ბუნებრივი intent (ახალჩამოსულს სჭირდება ბანკი/დაზღვევა) | ინტერესთა კონფლიქტი მოწყვლად აუდიტორიაზე; GDPR/ad-tracking; ნდობის ეროზია, თუ არ არის გამჭვირვალე; ადვოკატის referral — რეგულირებული (UK IAA, FR loi 1971) |
| **M4** | **გრანტები პლატფორმისთვის** | AMIF (national calls), EU CERV, Google.org Impact Challenge, Tech for Refugees, DIAIR „inclusion numérique" (~€500k პროგრამა [28]), MFA „დიასპორული ინიციატივების ხელშეწყობა" [17], Erasmus+/EEA | Integreat (Google.org), Handbook Germany (AMIF), Signpost (Tech for Refugees), Soliguide (FEDER) | ინდუსტრიის სტანდარტი; ლეგიტიმაცია | საჭიროა იურიდიული პირი (ასოციაცია/gGmbH), რეპორტინგი; მოკლე ციკლი; დამოკიდებულება |

**[შეფასება] რეკომენდებული სტეკი:** M1 + M4 პირველ 6 თვეში (გადაუდებელი: subscription bypass-ის დახურვა და paywall-ის მოხსნა ემიგრანტისთვის), M2 6–18 თვეში (პირველი 3 pilot პარტნიორი: ერთი ქართული დიასპორული ორგანიზაცია FR-ში, ერთი NGO, ერთი მუნიციპალური CCAS), M3 მხოლოდ ღია disclosure-ით და მხოლოდ არა-იურიდიულ სერვისებზე.

---

## 6. White-space ანალიზი

### 6.1 სად შეუძლია GrantKit-ს მოგება

| White space | მტკიცებულება | რატომ ვერ ავსებენ incumbents |
|---|---|---|
| **ქართული ენა** — სტრუქტურირებული ინტეგრაციის ინფო | არცერთ პროფილირებულ პლატფორმას არ აქვს ka [1][7][14][8][15]; gda.ge — დაბრუნება/საკონსულო [17]; FB ჯგუფები — არასტრუქტურირებული [55] | ეროვნული პლატფორმები ენას ამატებენ მოცულობის მიხედვით (uk, ar, ps, fa); ქართველები ~8k/წ FR-ში [19] — „საკმარისად დიდი, რომ არსებობდეს, ძალიან პატარა, რომ DIAIR-მა თარგმნოს" |
| **„შემიძლია თუ არა?" სიგნალი მრავალ ქვეყანაში** | Soliguide-ს აქვს, მაგრამ FR-ში [21]; FindHello-ს აქვს, მაგრამ US-ში [35]; Signpost-ს 20 ქვეყანა, მაგრამ სიგნალი ◐ [16] | ეროვნული მანდატი; არავინ აშენებს პან-ევროპულ ორგ-დირექტორიას ერთგვაროვანი სქემით |
| **~4% აღიარება ⇒ უსტატუსო ქართველების სეგმენტი** | EUAA: ქართველების recognition ~4%, „safe country" [20]; FR/DE/IT — ~80% განაცხადების [20] | სახელმწიფო პლატფორმები (Réfugiés.info) *ლტოლვილებზეა* ორიენტირებული; უსტატუსოს სერვისები (PASS, AME, Comede) ნაკლებად ხილვადია |
| **AI assistant curated დირექტორიაზე ka/ru-ში** | Signpost AI ვალიდაცია (RAG, Claude, HITL) [22][23]; ImmigrateAI 30k users/140 ქვეყანა [65] | Signpost AI შიდა ინსტრუმენტია მოდერატორებისთვის; საჯარო ka/ru assistant ინტეგრაციაზე — არავის |
| **მრავალქვეყნიანი მობილობა** (FR → DE → ES → US გადაადგილება) | IOM MigApp — 180 ქვეყანა, მაგრამ სავიზო/AVRR [40]; Kovcheg — 70 ქვეყანა, მაგრამ რუსებზე [59] | ეროვნული პლატფორმა საზღვარზე მთავრდება |
| **Google rating + reviews ორგანიზაციაზე** | არცერთ საჯარო პლატფორმას (Soliguide, Réfugiés.info, Findhelp) არ აქვს — ინსტიტუციური ნეიტრალიტეტი | სახელმწიფო ვერ „აფასებს" NGO-ებს; კერძო პლატფორმას შეუძლია |

### 6.2 სად არიან incumbents დაუმარცხებელი — **[შეფასება]**

| ტერიტორია | ლიდერი | რატომ არ ღირს შეჯიბრი |
|---|---|---|
| საფრანგეთი, ზოგადი აუდიტორია, fr/ar/uk/ps | Réfugiés.info (1M+ visitors, beta.gouv, 950 კონტრიბუტორი) + Soliguide (27.6k სტრუქტურა, CAF/Restos du Cœur პარტნიორები) | სახელმწიფო ბრენდი, დისტრიბუცია OFII/CCAS-ის გავლით, უფასო; GrantKit-ის 624 org — 2% Soliguide-ისა |
| გერმანია, მუნიციპალური | Integreat (140 კომუნა, open source) + Handbook Germany (€9M) | B2G კონტრაქტები დაკეტილია; open source ნიშნავს — უკეთესია Integreat-ზე *დაშენება* (fork/plugin ka ენით), ვიდრე კონკურენცია |
| აშშ, დირექტორია | Findhelp (300k პროგრამა, $304M) + FindHello + 211 | მასშტაბი და B2B ინფრასტრუქტურა |
| უკრაინელი ლტოლვილები | Germany4Ukraine, Dopomoha, Welcome.US | აუდიტორია უკვე მომსახურებულია სახელმწიფოს მიერ 4 ენაზე; uk არ არის GrantKit-ის ენა |
| ანტისამხედრო რუსული ემიგრაცია | Kovcheg (ბოტი, ბაზა, ოფისები) + Reforum | ბრენდი და თემი ჩამოყალიბებულია; GrantKit-ს ru-სთვის სხვა სეგმენტი სჭირდება (რუსულენოვანი ქართველები, სომხები, უკრაინელები, ცენტრ. აზია) |

**[შეფასება] დასკვნა:** GrantKit მოიგებს **ვერტიკალურად** (ენა × სტატუსი × „შემიძლია?" სიგნალი), არა **ჰორიზონტალურად** (ყველა მიგრანტი ყველა ქვეყანაში). „29 ქვეყანა" მარკეტინგში უნდა გახდეს „5 ქვეყანა, სადაც ქართველები ჩადიან: FR, DE, IT, ES, US" — სიღრმით.

---

## 7. პოზიციონირების ვარიანტები

| | **A. „ინტეგრაციის ნავიგატორი ქართველი და რუსულენოვანი ემიგრანტებისთვის"** | **B. „მრავალქვეყნიანი ორგანიზაციების დირექტორია ყველა იმიგრანტისთვის, ხელმისაწვდომობის სიგნალებით"** | **C. „ინფრასტრუქტურა დიასპორის ორგანიზაციებისა და NGO-ებისთვის (white-label + AI)"** |
|---|---|---|---|
| **Tagline (draft)** | „სად მიმიღებენ საბუთების გარეშე — ქართულად" | „Can I actually use this service? — 29 countries" | „Your community's integration guide, in their language, in 2 weeks" |
| **სამიზნე** | ქართველები FR/DE/IT/ES/US; რუსულენოვანი არა-რუსული ემიგრაცია; მათი ოჯახები საქართველოში | ყველა ახალჩამოსული | დიასპორული ორგ., საელჩოები, NGO, CCAS |
| **ბიზნეს-მოდელი** | Free + Helper Pro (M1) + გრანტები (M4) + M3 ფრთხილად | Subscription (დღევანდელი) ან ads | B2B2C ლიცენზია (M2) |
| **კონკურენცია** | პრაქტიკულად არავინ (§2D) | Soliguide, Findhelp, Réfugiés.info — პირდაპირ | Integreat, Soliguide API, Findhelp |
| **კონტენტის ტვირთი** | 5 ქვეყანა × 30 გიდი × 2 ენა + ორგ-დირექტორია სიღრმით | 29 ქვეყანა × ათასობით org — ვერ შენარჩუნდება | პარტნიორები თანა-ინახავენ |
| **Time-to-revenue** | 3–6 თვე (Pro), 6–12 (გრანტი) | დღეს (მაგრამ ვინ იხდის?) | 9–18 თვე |
| **რისკი** | პატარა TAM; „ეთნიკური" ბრენდი ზღუდავს | დაკარგვა incumbents-თან; paywall-ის ეთიკა | sales-heavy solo founder-ისთვის; პოლიტიკური სენსიტიურობა საელჩოსთან |
| **Fit დღევანდელ კოდთან** | მაღალი: ka/ru უკვე არის, სიგნალები არის, AI არის; აკლია გიდები | საშუალო: დირექტორია არის, სიგანე არა | დაბალი: არ არის multi-tenant, widget, API auth |

### რეკომენდაცია: **A ახლა, C როგორც შემოსავლის ხაზი 12 თვეში; B — არა.**

**დასაბუთება [შეფასება]:**
1. **A არის ერთადერთი დადასტურებული white space** (§2D, §6.1). B-ში GrantKit იბრძვის სახელმწიფოსთან უფასო პროდუქტით და ფასიანი paywall-ით — ეს წაგებულია.
2. **A ეყრდნობა დამფუძნებლის ავთენტურ უპირატესობას**: ქართველი ფაუნდერი, საფრანგეთის სიღრმისეული დაფარვა, ka/ru UI. Réfugiés.info-ს ქართული არასდროს ექნება; GrantKit-ს ფრანგული ბაზა Réfugiés.info-სავით არასდროს ექნება.
3. **A-ს დისტრიბუცია იაფია**: FB ჯგუფები „ქართველი ემიგრანტები", „Géorgiens en France", ეკლესია/საკვირაო სკოლა, gda.ge-ს დიასპორული ორგანიზაციების სია — არსებული არხები, ნულოვანი CAC.
4. **A → C ბუნებრივი გზაა**: როცა ქართული დიასპორული ორგანიზაცია FR-ში იყენებს, ის ხდება პირველი white-label კლიენტი; შემდეგ — სომხური, უკრაინული, აზერბაიჯანული დიასპორა იმავე ინფრასტრუქტურით (ენა — პარამეტრი).
5. **ru ენა A-ში აფართოებს TAM-ს** ისე, რომ არ ეჯახება Kovcheg-ს: რუსულენოვანი ქართველები, სომხები, ცენტრალური აზია, უკრაინელები, ვინც უპირატესობას ანიჭებს არაპოლიტიკურ ინსტრუმენტს.

**რა უნდა შეიცვალოს landing-ზე (მინიმალური, `en.ts`/`ka.ts`):** „640+ grants" → „ორგანიზაციები, რომლებიც მიგიღებენ — სტატუსის მიუხედავად"; „Get Access — $9/month" → „უფასოა ემიგრანტისთვის"; testimonials და „500+ Active members" — ამოღება, სანამ რეალური არ იქნება.

---

## 8. რისკები

| # | რისკი | მტკიცებულება / კონტექსტი | Mitigation |
|---|---|---|---|
| R1 | **კონტენტის სიახლე** — 1,100 org ერთი ადმინით | Soliguide-ს ლოკალური გუნდები + ამბასადორები სჭირდება [29]; Réfugiés.info — 950 კონტრიბუტორი [2]; GrantKit landing ამტკიცებს „Monthly updated" | „ბოლოს გადამოწმდა" თარიღი ყოველ ჩანაწერზე; claim-your-listing; მოხალისე „ამბასადორი" ქალაქზე; Google Places ავტომატური closed/hours sync; ავტომატური „report wrong info" |
| R2 | **ნდობა** — ყალბი social proof | `en.ts` L101–107: 3 testimonial + „500+ Active members"; DB users = 0 (2026-04) | დაუყოვნებლივ ამოღება; ჩანაცვლება ვერიფიცირებადი რიცხვებით (org count, „ბოლო განახლება") |
| R3 | **იურიდიული პასუხისმგებლობა არასწორ ინფოზე / „რჩევა" vs „ინფორმაცია"** | UK: იმიგრაციული რჩევა უნებართვოდ — დანაშაული (Immigration and Asylum Act 1999, IAA/OISC) [63]; FR: conseil juridique რეგულირებულია (loi 1971 — ჩემი ცოდნა); AI-ს პასუხი ასაილზე = რჩევა | Disclaimer ყველა ენაზე; AI system prompt: „ინფორმაცია, არა რჩევა; მიმართე X ორგანიზაციას"; არ დაპასუხდეს ინდივიდუალურ საქმეზე; Signpost-ის HITL პრეცედენტი [23]; ლოგირება |
| R4 | **AI hallucination მოწყვლად კონტექსტში** | Signpost: „safe usage only with HITL" [23]; GrantKit AI — direct DB queries, არა fact-checked სტატიების RAG | პასუხი მხოლოდ DB-ში არსებულ org-ებზე + ბმულით; „ვერ ვიპოვე" > გამოგონება; eval set ka/ru-ში |
| R5 | **Scraping/Places დამოკიდებულება** | Google Places ToS (rating/reviews cache limits), წყარო-საიტების ToS; LLM-enrichment ხარისხი | Places მონაცემების TTL-ის დაცვა; ორგანიზაციის თანხმობა listing-ზე (claim); enrichment-ის „AI-generated" მარკირება |
| R6 | **GDPR მოწყვლადი მომხმარებლებისთვის** | იმიგრაციული სტატუსი + ჯანმრთელობა (targetDiagnosis, uninsured) = Art. 9 special category (ჩემი შეფასება); onboarding აგროვებს country/purpose/needs; Paddle/Resend — transfer | Data minimisation: სტატუსის კითხვა მხოლოდ client-side ფილტრად, არა პროფილში; ანონიმური გამოყენება default; არანაირი ad-tracking; DPIA; EU hosting (Railway რეგიონი — გადასამოწმებელი) |
| R7 | **„accepts undocumented" სიგნალის პოლიტიკური წაკითხვა** | „safe country" დისკურსი [20]; Handbook Germany-ს „Anti-Abschiebungs-Plattform"-ად უწოდებენ კრიტიკოსები [7] | ფორმულირება როგორც ორგანიზაციის *საჯარო პოლიტიკა* (PASS/AME — კანონიერი სერვისები); წყაროს ციტირება |
| R8 | **Subscription bypass + billing** | audit #12: CRITICAL activate bypass, cancel არ ეუბნება Paddle-ს, webhook fail-open | სანამ paywall არსებობს — გამორთვა; თუ M1 — webhook-only activation |
| R9 | **საქართველოს პოლიტიკური კონტექსტი B2B2C-ში** | საელჩო/MFA პარტნიორობა (gda.ge) vs დიასპორის ნაწილის ნდობა | ნეიტრალური ბრენდი; პარტნიორობა ჯერ NGO/დიასპორულ ორგანიზაციებთან, არა სახელმწიფოსთან |
| R10 | **Solo-founder bandwidth** | 3 კონტენტ-მოდელი × 5 ქვეყანა × 2–5 ენა | სიღრმე > სიგანე: FR + ka/ru პირველი 6 თვე; DE მეორე |

---

## 9. წყაროები

1. Réfugiés.info — მისია/ენები: https://refugies.info/en/mission-and-impact ; https://pqn-a.fr/fr/ressources/guides-et-outils/refugies-info-la-plateforme-numerique-dediee-aux-refugies-et-a-leurs-aidants ; https://accueil-integration-refugies.fr/ressources/les-productions-de-la-diair/plaquette-de-presentation-de-refugies-info/
2. Réfugiés.info — 2024 რიცხვები (1M+ visitors, 1,000 fiches, 950 contributors, 150k downloads, €0.60): https://lamednum.coop/actions/refugies-info/ ; https://accueil-integration-refugies.fr/wp-content/uploads/2024/07/Livret-Impact-Refugies.infos-2024.pdf ; https://beta.gouv.fr/startups/refugies.info
3. Soliguide — 27,600 სტრუქტურა / 40 დეპარტამენტი / 2026 მიზანი: https://www.seine-et-marne.fr/fr/actualites/decouvrez-soliguide-carte-solidaire-quotidien ; https://pays-de-la-loire.dreets.gouv.fr/Plateforme-Soliguide
4. Soliguide — 98,000 სერვისი, 3.7M ძიება 2024: https://www.paysdelaloire.prse.fr/soliguide-rendre-les-informations-de-la-solidarite-a1188.html?lang=fr ; https://www.solidatech.fr/ressources/soliguide-la-cartographie-des-lieux-solidaires-pour-orienter-les-plus-demunis/
5. Integreat — 140 კომუნა, ენები, Google.org: https://tuerantuer.de/digitalfabrik/projekte/integreat/ ; https://www.mrn-news.de/2026/03/02/landkreis-suedliche-weinstrasse-fuehrt-integreat-app-ein-informativ-in-vielen-sprachen-verfuegbar-und-auch-ohne-internetzugang-nutzbar-626954/ ; https://www.nachhaltigkeit.augsburg.de/zukunftspreis/projektdetails/app-integreat-augsburg ; https://en.wikipedia.org/wiki/Integreat
6. Integreat — ღირებულება €4–15k/წ, MIT/Apache: https://integreat-app.de/kosten-fuer-den-integreat-betrieb/ ; https://kommunalwiki.boell.de/index.php/Integreat ; https://github.com/digitalfabrik/integreat-app
7. Handbook Germany — ენები, დაფინანსება (AMIF €9M, BMI €300k/წ), Germany4Ukraine AMIF: https://neuemedienmacher.de/handbook-germany/ ; https://de.wikipedia.org/wiki/Handbook_Germany ; https://www.bundestag.de/presse/hib/kurzmeldungen-1024084 ; https://www.eu-migrationsfonds.de/SharedDocs/Meldungen/DE/Projekte/250509-projekt-g4u.html ; https://www.kettner-edelmetalle.de/news/bundesregierung-fordert-anti-abschiebungs-plattform-mit-millionenbetragen-20-09-2024
8. USAHello — 3.5M 2024, ენები, FindHello 6,000/60k: https://usahello.org/about-us/ ; https://usahello.org/findhello/ ; https://www.guidestar.org/profile/45-3789421
9. USAHello — Form 990 2024: https://projects.propublica.org/nonprofits/organizations/453789421 ; https://givefreely.com/charity-directory/nonprofit/ein-453789421/
10. GrantWatch pricing: https://www.grantwatch.com/plans.php ; https://www.grantwatch.com/about.php ; https://grantsights.com/blog/grantwatch-review-alternative-2026
11. Instrumentl pricing: https://www.capterra.com/p/233384/Instrumentl/pricing/ ; https://grantsights.com/blog/instrumentl-pricing ; https://www.instrumentl.com/blog/grantwatch-pricing
12. Candid FDO pricing: https://www.trustradius.com/products/candid-foundation-directory-online/pricing ; https://candid.org/pricing/ ; https://grantsights.com/blog/candid-foundation-directory-pricing
13. Turn2us annual reports: https://www.turn2us.org.uk/about-us/news-and-media/media-centre/annual-reports/annual-report-2025 ; https://www.turn2us.org.uk/about-us/news-and-media/latest-news/annual-report-2024-2025 ; https://www.turn2us.org.uk/about-us/news-and-media/latest-news/annual-report-2023-24 ; https://en.wikipedia.org/wiki/Turn2us
14. Soliguide — 8 ენა, ფორმატები, open source: https://solinum.org/en/soliguide ; https://european-social-fund-plus.ec.europa.eu/en/social-innovation-match/case-study/soliguide-digital-platform-revolutionising-access-information ; https://github.com/solinumasso/soliguide ; https://apps.apple.com/fr/app/soliguide/id1495949521
15. Settle In — ენები: https://settlein.app/ ; https://apps.apple.com/in/app/settle-in/id1353000516 ; https://coresourceexchange.org/2018/06/04/download-cores-mobile-app-settle-in
16. Signpost — 20 ქვეყანა, 25 ენა, 1M 2018: https://www.rescue.org/press-release/signpost-digital-initiative-reaches-1-million-people-across-three-continents ; https://www.rescue.org/article/impact-signpost-bridging-information-gap-people-crisis ; https://www.signpost.ngo/press
17. gda.ge — MFA დიასპორის დეპარტამენტი, სერვისები, გრანტი: https://gda.ge/pages/gdage-portalis-shesakheb ; https://gda.ge/pages/diasporuli-initsiativebis-khelshetskoba ; https://gda.ge/pages/reintegratsiis-gzamkvlevi ; https://gda.ge/pages/diasporuli-organizatsiebi ; https://gda.ge/pages/tskheli-khazi
18. migration.commission.ge: https://migration.commission.ge/index.php?article_id=1&clang=1 ; https://migration.commission.ge/files/immigration_eng.pdf ; https://migration.commission.ge/files/mp19_eng_web3.pdf ; https://www.gfmd.org/pfp/ppd/19116
19. ქართველების თავშესაფრის განაცხადები FR (8,099 2022; top-5): https://www.lacimade.org/rapport-dactivite-ofpra-cartographie-de-la-demande-dasile-en-2022/ ; https://www.lacimade.org/rapport-dactivite-ofpra-2024-cartographie-de-la-demande-dasile/ ; https://www.ofpra.gouv.fr/actualites/rapport-dactivite-2024
20. EUAA — ქართველები EU+ (8,075 პირველ 4 თვეში 2022; FR 2,725 / DE 2,455 / IT 1,100; recognition ~4%; safe country): https://euaa.europa.eu/news-events/russian-invasion-ukraine-prompts-surge-asylum-related-migration-georgians-eu ; https://www.euaa.europa.eu/sites/default/files/publications/2025-02/EUAA_Latest_Asylum_Trends_2024.pdf ; https://asylumineurope.org/reports/country/germany/asylum-procedure/the-safe-country-concepts/safe-country-origin/
21. Soliguide — publics/conditions ფილტრები: https://www.ville-creteil.fr/solidarite-soliguide-lentraide-a-portee-de-clic ; https://www.commentaider.fr/soliguide/ ; https://www.solinum.org/tout/
22. Signpost AI — RAG, ~30k სტატია, Claude: https://nethope.org/case-studies/signpost-ai-consortium-of-irc-mercy-corps-internews-and-local-partners/ ; https://academy.evalcommunity.com/signpost-ai-information-assistant/
23. Signpost AI — პილოტები, HITL: https://data.org/our-work/challenges/artificial-intelligence-to-accelerate-inclusion-challenge/awardees/irc/ ; https://www.rescue.org/irc-responsible-ai-humanitarian-sector ; https://restofworld.org/2026/irc-signpost-humanitarian-ai-refugee-assistance/
24. Arrive (RBC Ventures): https://ca.linkedin.com/company/arriveincad ; https://connections.arrivein.com/ ; https://www.rbcroyalbank.com/new-to-canada/pre-arrival/
25. Expatica ბიზნეს-მოდელი: https://www.expatica.com/advertise-with-expatica/ ; https://www.expatica.com/product/directory-listing/ ; https://tracxn.com/d/companies/expatica/__JdNlN-5CH5lvhvMdehF_lbZEySMGjLKpJXsqQhUm1ms ; https://leadiq.com/c/expatica/5a1d8e265400005b00748100
26. Findhelp — $304M, B2B, Uno Health: https://pitchbook.com/profiles/company/83038-69 ; https://www.cbinsights.com/company/findhelp/financials ; https://www.prnewswire.com/news-releases/findhelp-recognized-as-a-top-impact-company-by-real-leaders-and-one-of-the-best-places-to-work-by-built-in-302345140.html
27. Findhelp — 300,000+ პროგრამა: https://company.findhelp.com/products/the-findhelp-network/ ; https://company.findhelp.com/faq ; https://www.findhelp.org/
28. Réfugiés.info — DIAIR/MedNum, inclusion numérique ~€500k: https://accueil-integration-refugies.fr/programme-inclusion-numerique/ ; https://accueil-integration-refugies.fr/refugies-info-la-plateforme-continue-a-senrichir/ ; https://refugies.info/en/procedure/6644c7ec44a3c87bf2c66684
29. Solinum — მოდელი, API/widget, ამბასადორები, Crédit Mutuel €10k: https://www.solinum.org/activites/soliguide ; https://solinum.org/api-solidarite ; https://solinum.org/deployer-soliguide ; https://www.solinum.org/en/devenez-ambassadeur-soliguide/ ; https://lessentieldeleco.fr/3241-solinum/
30. Solinum — FEDER Interreg, France Active: https://www.avise.org/actualites/mieux-connaitre-les-offres-de-financement-europeen-dediees-aux-entreprises-de-less-0 ; https://www.finance-fair.org/project/solinum/
31. Watizat: https://watizat.org/nos-antennes/ ; https://watizat.org/guides-paris/ ; https://watizat.org/guides-lyon/ ; https://www.jeveuxaider.gouv.fr/organisations/32708-watizat ; https://www.helloasso.com/associations/watizat
32. Handbook Germany — page views, ევალუაცია 2025: https://hbg.ngo/ ; https://www.e-beratungsinstitut.de/handbook-germany-evaluation/
33. Ankommen App: https://www.bamf.de/DE/Themen/Integration/ZugewanderteTeilnehmende/ErsteOrientierung/AppAnkommen/app-ankommen-node.html ; https://www.goethe.de/de/uun/prs/int/gen/20713130.html
34. Germany4Ukraine: https://www.bmi.bund.de/SharedDocs/pressemitteilungen/DE/2022/03/start-germany4ukraine.html ; https://www.digitale-verwaltung.de/Webs/DV/DE/onlinezugangsgesetz/ozg-foederal/themenfelder/ein-und-auswanderung/germany4ukraine/germany4ukraine-node.html ; https://www.germany4ukraine.de/hilfeportal-en
35. FindHello — სტატუს-ფილტრი, offline: https://usahello.org/findhello/ ; https://tsosrefugees.org/blog/2022/01/18/usahello-org-and-welcome-ustwo-helpful-online-tools-for-our-refugee-friends-and-u-s-locals-who-are-welcoming-them ; https://thecrg.org/resources/FindHello
36. Welcome.US / Welcome Connect: https://welcome.us/welcome-connect ; https://welcome.us/press/tech-for-refugees-announces-new-grant-for-welcome-connect-platform ; https://welcome.us/who-we-are/our-2023-impact ; https://www.prnewswire.com/news-releases/welcomeus-expands-welcome-connect-platform-to-match-us-sponsors-with-cubans-haitians-nicaraguans-and-venezuelans-seeking-refuge-301747757.html
37. CORE/Settle In — PRM, FB reach: https://www.coresourceexchange.org/about-core/ ; https://www.rescue.org/press-release/irc-settle-program-expands-support-spanish-speaking-refugees-through-social-media ; https://globalcompactrefugees.org/good-practices/cultural-orientation-throughout-resettlement-journey
38. Signpost — ტექ-პარტნიორები: https://www.rescue.org/press-release/international-rescue-committee-mercy-corps-google-microsoft-cisco-and-tripadvisor ; https://www.rescue.org/announcement/tech-refugees-donation-international-rescue-committee-enables-expansion-ircs-signpost
39. help.unhcr.org: https://www.unhcr.org/digitalstrategy/help-sites/ ; https://www.unhcr.org/innovation/help-unhcr-org-platform-asylum-seekers-access-information/ ; https://help.unhcr.org/ ; https://help.unhcr.org/georgia/frequently-asked-questions/ ; https://help.unhcr.org/spain/en/acceso-sistema-acogida/
40. IOM MigApp: https://www.iom.int/news/iom-releases-redesigned-now-customizable-mobile-app-migapp-4-new-languages ; https://apps.apple.com/us/app/migapp-trusted-travel-support/id1227371348 ; https://weblog.iom.int/migrant-application-migapp
41. Settlement.org / OCASI: https://ocasi.org/settlementorg ; https://settlement.org/ ; https://mnlct.org/wp-content/uploads/2024/07/OCASI-Websites-and-Resources.pdf
42. Migrant Help — £235M კონტრაქტი: https://questions-statements.parliament.uk/written-questions/detail/2026-01-08/104356 ; https://www.migranthelpuk.org/news/migrant-help-awarded-new-contract ; https://en.wikipedia.org/wiki/Migrant_Help
43. Refugee Council UK: https://www.refugeecouncil.org.uk/how_you_can_help_us/trusts_and_foundations/key_projects ; https://funding.idoxopen4community.co.uk/refugeecouncil ; https://en.wikipedia.org/wiki/Refugee_Council
44. Dopomoha: https://dopomoha.ro/en ; https://commitglobal.org/en/ukraine ; https://interoperable-europe.ec.europa.eu/collection/open-source-observatory-osor/news/supporting-ukrainian-refugees-open-source
45. Ukraine Take Shelter: https://www.cnn.com/2022/03/20/us/harvard-students-ukraine-refugees-website-hosts-shelter ; https://www.cbsnews.com/news/ukraine-take-shelter-website-refugees-harvard-marco-burstein-avi-schiffman/
46. CEAR / Accem / Cruz Roja: https://www.cear.es/apoyo-a-asociaciones-de-personas-refugiadas-y-migrantes/guia-de-recursos/enlaces-de-interes/ ; https://www.infobae.com/espana/agencias/2025/05/26/crean-un-glosario-multilingue-sobre-asilo-para-migrantes-llegados-por-mar/ ; https://www2.cruzroja.es/en/migrar ; https://progressivespain.com/ngofile-cear-spanish-committee-for-refugee-aid/
47. EWSI → Migrant Integration Hub: https://migrant-integration.ec.europa.eu/index.php/about_en ; https://www.migpolgroup.com/index.php/portfolio-item/the-european-web-site-on-integration/ ; https://www.mirovni-institut.si/en/the-european-website-on-integration-ewsi-becomes-the-migrant-integration-hub/
48. InfoMigrants: https://www.infomigrants.net/en/about ; https://www.francemediasmonde.com/en/our-media/infomigrants/ ; https://en.wikipedia.org/wiki/InfoMigrants ; https://www.ojim.fr/les-subventions-dinfomigrants-sauvent-la-mise-de-france-medias-monde/
49. 211: https://www.211.org/about-us ; https://www.unitedway.org/news/211-helpline-data-reveals-most-pressing-us-community-needs ; https://en.wikipedia.org/wiki/211_(telephone_number)
50. Turn2us — უფასო ინდივიდისთვის, ფონდები რეგისტრირდებიან უფასოდ: https://www.turn2us.org.uk/services-for-organisations/add-your-grants-to-the-grants-search ; https://grants-search.turn2us.org.uk/
51. Turn2us — org tools, £100+VAT: https://www.turn2us.org.uk/services-for-organisations ; https://www.vrassociationuk.com/resources/overview-of-the-benefit-information-resources-provided-by-turn2us ; https://www.turn2us.org.uk/services-for-organisations/use-our-tools
52. Benefits.gov → USA.gov: https://www.usa.gov/blog/2024/10/creating-the-new-benefits-experience-on-usa-gov-and-usagov-en-espanol ; https://fedscoop.com/digital-service-migration-to-usa-gov-a-step-backward-or-long-overdue/ ; https://en.wikipedia.org/wiki/Benefits.gov
53. gda.ge — მთავარი/კონსულტაცია: https://gda.ge/ ; https://gda.ge/pages/miiget-dokumentebi-sakartveloshi-chamousvlelad ; https://gda.ge/pages/reintegratsiis-sakhelmtsifo-programa
54. emigrantebi.org / .ge: https://emigrantebi.org/ ; https://emigrantebi.ge/aboutus/ ; https://emigrantebi.org/category/home/germany/
55. ქართული FB ჯგუფები: https://www.facebook.com/groups/235434743502214/ ; https://www.facebook.com/groups/GeorgianImmigrantsinUSA/ ; https://www.facebook.com/groups/277297115980241/ ; https://www.facebook.com/groups/3056959481117484/ ; https://www.facebook.com/georgiensenfrance/
56. ქართული დიასპორის რიცხვები (DE 50k, FR 35k, US 120k — MFA შეფასება): https://en.wikipedia.org/wiki/Georgian_diaspora ; https://www.facebook.com/georgianassociationinusa/
57. დიასპორული ორგანიზაციები FR: https://gda.ge/pages/safrangetis-respublika ; https://france.mfa.gov.ge/welcome
58. Kovcheg — ისტორია, foreign agent: https://ru.wikipedia.org/wiki/%D0%9A%D0%BE%D0%B2%D1%87%D0%B5%D0%B3_(%D0%BE%D1%80%D0%B3%D0%B0%D0%BD%D0%B8%D0%B7%D0%B0%D1%86%D0%B8%D1%8F) ; https://novayagazeta.eu/articles/2022/11/30/russkii-kovcheg ; https://kovcheg.live/en/about-us/
59. Kovcheg — База знаний, 70 ქვეყანა, 2026-08 ზრდა: https://kovcheg.live/cards/ ; https://kovcheg.live/cards/chek-list-pereezd/ ; https://kovcheg.live/en/ark/ ; https://meduza.io/news/2026/08/21/kovcheg-zafiksiroval-rezkiy-rost-interesa-rossiyan-k-emigratsii-na-fone-sluhov-o-novoy-volne-mobilizatsii ; https://www.svoboda.org/a/kovcheg-eto-ne-steny-kak-zhivet-gosudarstvo-v-izgnanii-/33201712.html
60. Kovcheg — დონაციები 2022: https://meduza.io/feature/2022/04/05/mesto-gde-budet-vozmozhnost-otdyshatsya ; https://kovcheg.live/donate/
61. Reforum Space: https://space.reforum.io/ ; https://reforumspaces.io/ ; https://reforum.io/blog/2023/07/14/reforum-spacetallinn-otmetil-pervuyu-godovshhinu-raboty/
62. Telegram ЭМИГРАНТЫ 360 / forum_europa: https://trip360.shop/chat ; https://tgstat.com/chat/@forum_europa ; https://tgstat.ru/en/channel/@slavianskiy_forum ; https://habr.com/ru/post/424277/
63. UK IAA/OISC — იმიგრაციული რჩევის რეგულაცია: https://www.gov.uk/government/publications/oisc-faqs/oisc-faqs ; https://freemovement.org.uk/what-is-the-oisc/ ; https://www.lexisnexis.com/en-gb/legal/guidance/giving-immigration-advice-in-the-uk ; https://www.whatdotheyknow.com/request/legality_on_providing_immigratio
64. InterNations: https://techcrunch.com/2020/08/21/this-subscription-social-network-is-happy-to-be-an-albatross-in-a-pandemic/ ; https://cms.in-cdn.net/cms-media/public/2023-06/ALBATROSS%20BENEFITS.pdf
65. AI newcomer assistants: https://investnovascotia.ca/news-and-stories/immigrateai-global-revolutionizing-immigration-ai ; https://www.newswire.ca/news-releases/immigration-news-canada-launches-the-world-s-first-ai-for-canadian-immigration-813859901.html ; https://dl.acm.org/doi/10.1145/3786304.3787919 ; https://benmore.tech/case-studies/settlein/

**შიდა წყაროები (GrantKit):** `/home/user/grantkit/CLAUDE.md`; `/home/user/grantkit/.grantkit-redesign/ORG-CENTRIC-MEMORY.md` §1–§2; `/home/user/grantkit/client/src/i18n/en.ts` L15–120; `/home/user/grantkit/audit-reports/12-subscription-funnel.md`.
