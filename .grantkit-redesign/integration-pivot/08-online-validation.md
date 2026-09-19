# 08 — ონლაინ ვალიდაცია (desk research) — Phase 1 item 1.1-ის ჩანაცვლება

> **ავტორი (persona):** Ezra — ინტეგრაციის საჭიროებების მკვლევარი · **თარიღი:** 2026-09-19
> **რატომ არსებობს:** მფლობელმა გააუქმა 1.1-ის ინტერვიუები, card sort, fake-door და cold-call და ჩაანაცვლა **ონლაინ desk research-ით**. ეს ანგარიში იმავე კითხვებს პასუხობს ვებ-წყაროებით. MASTER-PLAN v2 §5 row 1.1-ის „done when" (`reports/05-validation.md`) ამ ფაილით იფარება.
> **მეთოდი და შეზღუდვა:** WebSearch + WebFetch sandbox proxy-დან. **WebFetch პრაქტიკულად ყველა სამიზნე დომენზე დაბლოკილი იყო** (ofpra.gouv.fr, lacimade.org, ec.europa.eu, asylumineurope.org, integreat-app.de, company.findhelp.com, t.me, facebook.com, tgstat, infrance.su, kartuli.fr, ambebi.ge და სხვ.). ამიტომ ყველა რიცხვი მოდის **საძიებო snippet-ებიდან** — მონიშნულია `[fact, secondary]` (გვერდი ვერ გაიხსნა, snippet-ია) ან `[fact]` (ორი დამოუკიდებელი წყარო ემთხვევა). `[estimate]` = ჩემი გამოთვლა წყაროებიდან; `[assumption]` = დაშვება, რომელიც ადამიანთან საუბრის გარეშე ვერ მოწმდება.
> **სიგრძე:** ≈2,600 სიტყვა.

---

## 0. TL;DR

1. **მოთხოვნა არსებობს და გაზომვადია:** ქართველები საფრანგეთის თავშესაფრის top-10-ში არიან 2023 (მე-7), 2024 და 2025 (მე-10) წლებში; EU-ში 2024-ში 15,509 განაცხადი, აქედან 82% იტალია/საფრანგეთი/გერმანია; აღიარება ≈4%, განმეორებითი განაცხადი 17% (მე-2 ადგილი) — ანუ ხანგრძლივი, „უსტატუსო" ყოფნა საფრანგეთში დომინანტური სცენარია. დიასპორა ≈30k `[fact, secondary]`. `[§1]`
2. **ონლაინ თავშეყრის ადგილები ცნობილია, ზომები — ნაწილობრივ:** ka: FB „ასოციაცია ქართველები საფრანგეთში" (9.6k like), SheniEmigranti.ge (43k like, ჯგუფების კატალოგი), **kartuli.fr** (ქართულენოვანი პორტალი საფრანგეთისთვის — ახალი, ანგარიშ 02-ში არ იყო), emigrantebi.ge/.org, justfly.ge გიდები; ru: Telegram `@RUSSIAN_in_FRANCE`, „Русские в Париже", `@frarus_fr`, ფორუმი infrance.su (41-გვერდიანი thread „Что можно с récépissé?"). წევრების რიცხვები Telegram/FB ჯგუფებზე **ვერ ვერიფიცირდა** (tgstat/facebook დაბლოკილი). `[§1.3]`
3. **≥15 განმეორებადი კითხვა** ამოღებულია (§1.4) — 80% ეხება `legal_status`, `money_benefits` (ADA/CAF), `health` (AME/carte vitale) და `daily_life/translation`. ეს ემთხვევა 01 §4-ის ევიდენსს.
4. **ტაქსონომია:** 11 დომენიდან 9 ბუნებრივად ჯდება ხალხის ლექსიკაში; 2 საჭიროებს ka/ru label-ის შეცვლას (`daily_life`, `safety_rights`), 3-ს — ქვე-ლეიბლების დამატება ინსტიტუტების აკრონიმებით (OFII, CAF, ANEF, récépissé), რადგან ხალხი **ინსტიტუტის სახელით ეძებს, არა დომენით**. `[§2]`
5. **მონაცემთა სიახლის baseline (რეპოს ექსპორტიდან):** `data/organizations-2026-04-20.xlsx`-ში საფრანგეთის მხოლოდ **16 ჩანაწერია და 16/16-ს არც website, არც phone, არც email არ აქვს** `[fact]`. 5 შემოწმებულიდან 3 რეალური სტრუქტურაა სწორი მისამართით (ტელეფონი ვებიდან დაემატა), 1 არასწორია (AME „ორგანიზაციად" მინისტრის მისამართზე), 1 არაზუსტი (FSL = ჟირონდის GIP, არა ეროვნული). 624 FR ორგანიზაცია მხოლოდ prod DB-შია — ვერ შემოწმდა. `[§3]`
6. **WTP:** ბაზარი მომხმარებლისთვის 100% უფასოა და **ორგანიზაციებიც ლისტინგში არ იხდიან** (Findhelp claim = $0, Turn2us adviser = უფასო, Soliguide ambassadeur = უფასო). გადამხდელი მოდელი, რომელიც რეალურად არსებობს, არის **B2G-ლიცენზია** (Integreat €4–15k/წ კომუნაზე; Fürth €25k/5 წ) და **გრანტი** (Handbook Germany €1.82M AMIF 90%; Réfugiés.info — სახელმწიფო; Solinum — FEDER €1.57M + დეპარტამენტების co-financing). **Org Pro €300–900/წ-ის პირდაპირი ანალოგი ვერ ვიპოვე** — ეს ფასი „მიკრო-ლიცენზიაა", რომელიც ბაზარზე არ არსებობს; დამაჯერებელია მხოლოდ თუ ka/ru ინტერპრეტაციის ხარჯს ცვლის (OFII-ს აქვს ცალკე „langues caucasiennes (géorgien, tchétchène)" lot; ბაზრის ტარიფი ≈€25/სთ). Concierge €290/€590: facilitator-ების ბაზარი $1,500–5,000/პაციენტი (PlacidWay) ან 0 პაციენტისთვის + კლინიკის კომისია (Bookimed, BE FREE) — ჩვენი ფასი 3–10× იაფია, ანუ „ფლატი კლინიკის კომისიის გარეშე" პოზიცია ლეგიტიმურია, მაგრამ მოთხოვნის სიგნალი ონლაინ **სუსტია**: ქართველი პაციენტები საფრანგეთს არ ეძებენ, ეძებენ თურქეთს/ისრაელს/გერმანიას, სახელმწიფოც 300 ბავშვს იქ აფინანსებს. `[§4]`
7. **Fake-door-ის ჩანაცვლება:** 1-საათიანი, ნულოვანი ხარჯის ტესტი — ერთი ka + ერთი ru პოსტი, Google Form-ის გარეშე, ზომვა კომენტარებით/DM-ებით. ტექსტი §5-შია; **არაფერი დაპოსტილა**.
8. **ვერდიქტი (§6):** 1.1-ის 5 კრიტერიუმიდან 2 „დაფარულია ონლაინ" (demand, taxonomy), 1 „ნაწილობრივ" (freshness), 2 „ვერ იფარება ადამიანის გარეშე" (WTP-ის „ვინ წყვეტს/რომელი ბიუჯეტი", fake-door sign-up). ეს პატიოსნად უნდა დარჩეს ღიად.

---

## 1. მოთხოვნის ევიდენსი (ინტერვიუების ჩანაცვლება)

### 1.1. ზომები — ქართველები საფრანგეთში

| მაჩვენებელი | მნიშვნელობა | ტეგი | წყარო |
|---|---|---|---|
| ქართული დიასპორა საფრანგეთში | ≈30,000 | `[fact, secondary]` | [Wikipédia — Émigration géorgienne vers la France](https://fr.wikipedia.org/wiki/%C3%89migration_g%C3%A9orgienne_vers_la_France) (გვერდი დაბლოკილი; snippet) |
| ისტორიული ზრდა | 2013: ≈10k (500 სტუდენტი, 2k თავშესაფარი, 8k ლეგალური); 2017: >14.5k | `[fact, secondary]` | [Wikipedia — Georgians in France](https://en.wikipedia.org/wiki/Georgians_in_France) |
| INSEE „immigrés nés en Géorgie" | ცხრილი არსებობს (RP2021), რიცხვი snippet-ში არ ჩანს | `[unverified]` | [INSEE 6478089](https://www.insee.fr/fr/statistiques/6478089?sommaire=6478362) |
| თავშესაფარი FR 2018 (პიკი) | ≈5,000 პირველი განაცხადი, +259% 2017→2018, მე-4 ადგილი; „7,000 ქართველი უვიზოდ ჩამოვიდა და თავშესაფარი ითხოვა სამკურნალოდ" | `[fact, secondary]` | [Forum réfugiés](https://www.forumrefugies.org/s-informer/publications/articles-d-actualites/dans-le-monde/245-georgie-un-pays-d-origine-sur-ou-des-risques-de-persecution-persistent); [France24 2019](https://www.france24.com/fr/20191010-focus-georgiens-france-immigration-demande-asile-abus-aide-medicale-etat-soins-sante-visas) |
| თავშესაფარი FR 2023 | ქართველები **მე-7** ადგილზე (Afghanistan, Guinea, Türkiye, Côte d'Ivoire, Bangladesh, DRC, **Georgia**, Sudan, Albania, Sri Lanka) | `[fact, secondary]` | [AIDA France statistics](https://asylumineurope.org/reports/country/france/statistics/) |
| თავშესაფარი FR 2024 | top-10-ში **არ** ჩანს OFPRA-ს ხუთეულში; „safe country" 13 ქვეყნიდან სულ 10,664 პირველი განაცხადი (8%); საქართველო = **10% დაჩქარებული პროცედურების** | `[fact, secondary]` | [Cimade — cartographie 2024](https://www.lacimade.org/rapport-dactivite-ofpra-2024-cartographie-de-la-demande-dasile/); [AIDA safe country](https://asylumineurope.org/reports/country/france/asylum-procedure/the-safe-country-concepts/safe-country-origin/) |
| თავშესაფარი FR 2025 | ქართველები **მე-10** ადგილზე (Ukraine, DRC, Afghanistan, Haiti, Sudan, Guinea, Côte d'Ivoire, Türkiye, Bangladesh, **Georgia**); სულ 152,904 რეგისტრაცია, 116,944 პირველი; réexamen ქართველებზე −5% | `[fact, secondary]` | [ECRE AIDA 2025](https://ecre.org/aida-country-report-on-france-update-on-2025/); [Cimade bilan 2025](https://www.lacimade.org/bilan2025asile/); [DGEF 2025](https://www.immigration.interieur.gouv.fr/chiffres-de-limmigration-en-france/demandes-dasile-en-2025-procedure-sur-deux-aboutit-a-protection) |
| EU-ს დონე 2024 | ქართველების 15,509 განაცხადი EU-ში; 82% — იტალია, საფრანგეთი, გერმანია; გერმანიაში H1 2023→H1 2024: 5,155 → 1,395 | `[fact, secondary]` | [1TV / Eurostat](https://1tv.ge/lang/en/news/georgian-asylum-applications-to-eu-decrease-in-2024-eurostat-reports/); [EUAA Georgia](https://euaa.europa.eu/news-events/russian-invasion-ukraine-prompts-surge-asylum-related-migration-georgians-eu) |
| აღიარება / განმეორება | აღიარება ≈4%; განმეორებითი განაცხადი 17% (მე-2 ადგილი 20 ნაციონალობაში), ძირითადად FR/DE/BE | `[fact]` (EUAA + AIDA ემთხვევა) | [EUAA Latest Asylum Trends 2024](https://www.euaa.europa.eu/sites/default/files/publications/2025-02/EUAA_Latest_Asylum_Trends_2024.pdf) |
| სამედიცინო მოტივი | „საფრანგეთი არ არის ქართველი ავადმყოფების #1 მიმართულება — თურქეთი, ისრაელი"; AME-ს უფლებამოსილთა მხოლოდ 10% ასახელებს ჯანმრთელობას მიგრაციის მთავარ მიზეზად (IRDES 2019); 2024-ში AME 466k ბენეფიციარი, 14% — თავშესაფარზე უარყოფილი | `[fact, secondary]` | [Sciences Po — droit au séjour et santé des géorgiens](https://www.sciencespo.fr/ecole-droit/fr/actualites/droit-au-sejour-et-problematiques-de-sante-des-ressortissants-georgiens/); [Europe1 2024-11](https://www.europe1.fr/societe/ces-migrants-attires-par-le-systeme-medical-francais-ici-les-medecins-sont-bien-meilleurs-3924223) |

**[estimate] SAM-ის შემოწმება:** თუ 2024-ში EU-ში 15.5k განაცხადია და საფრანგეთი სამეულშია, საფრანგეთის წილი ≈4–6k/წ ახალი ქართველი განმცხადებელი; 4% აღიარებით და 17% განმეორებით, ყოველწლიურად ≈4–5k ადამიანი **რჩება საფრანგეთში უსტატუსოდ ან récépissé-ზე** — ეს არის ka-სეგმენტის რეალური ბირთვი (ეტაპი 1–2, 01 §3). 05-ის SAM (≈45k აქტიური) ამასთან თანხვედრაშია.

**ქალაქები** `[fact, secondary]`: პარიზი (მეტროპოლია), ლიონი, ტულუზა, მარსელი, ნიცა, ბორდო, სენტ-ეტიენი (Wikipedia); **სტრასბურგი** — „ქართველები მრავლად არიან ბინადრობის მოთხოვნაში; Étoile-ის ბანაკი/სქვოტები; «Si des Géorgiens viennent à Strasbourg, souvent, c'est pour ne pas mourir»" ([Rue89 Strasbourg](https://www.rue89strasbourg.com/pourquoi-georgiens-viennent-strasbourg-250674)); წმ. ქეთევანის ეკლესია სტრასბურგში 1994-დან ([SheniEmigranti](https://sheniemigranti.ge/%E1%83%A1%E1%83%90%E1%83%93-%E1%83%9B%E1%83%93%E1%83%94%E1%83%91%E1%83%90%E1%83%A0%E1%83%94%E1%83%9D%E1%83%91%E1%83%A1-%E1%83%A5%E1%83%90%E1%83%A0%E1%83%97%E1%83%A3%E1%83%9A%E1%83%98-%E1%83%A2/)); **რეიმსი** — „ქართველები, ავღანელები და ალბანელები ძირითადი მაძიებლები", Croix-Rouge CADA/PIADA რეიმსში ([Monique Derrien](https://www.moniquederrien.com/solidarite-pour-les-migrants-a-reims/); [Croix-Rouge CADA Reims](https://www.croix-rouge.fr/centre-d-accueil-pour-demandeurs-d-asile-de-reims)). **[assumption]** რეიმსის ქართული კონცენტრაცია (PIVOT-ის ბიჩჰედი) ონლაინ **რაოდენობრივად ვერ დადასტურდა** — მხოლოდ თვისებრივი ხსენებები 2009–2020.

### 1.2. რუსულენოვანი სეგმენტი

- Telegram: `@RUSSIAN_in_FRANCE` (ჩატი, წესები, ადმინები @unknown_ya/@catherine_fr), „Русские в Париже" (tgram.me კატალოგი), `@frarus_fr` (არხი „Фрарус — Франция на русском"), `@forum_france`, `@integration_fr` („Інтеграція українців // Интеграция во Франции"), `@refugeesinFrance` („Помощь украинцам во Франции") — `[fact, secondary]` [tgstat](https://tgstat.com/chat/@RUSSIAN_in_FRANCE), [telegid (25 არხი, 46 ჩატი „Франция")](https://telegid.me/catalog/franciya). **წევრთა რიცხვი ვერ წავიკითხე** (tgstat/t.me დაბლოკილი).
- Facebook: „Русские во Франции/Russes en France" (group 687402491442221), გვერდი @rus.france (4,959 like), რეგიონული ჯგუფების კატალოგი [avefrance.com](https://avefrance.com/france-all/regionalnye-russkojazychnye-gruppy-fb-vo-francii/), [ruskatalog.fr](https://ruskatalog.fr/directory-ruskatalog/categories/%D1%81%D0%B0%D0%B9%D1%82%D1%8B-%D0%B3%D1%80%D1%83%D0%BF%D0%BF%D1%8B-%D1%81%D0%BE%D0%BE%D0%B1%D1%89%D0%B5%D1%81%D1%82%D0%B2%D0%B0/) `[fact, secondary]`.
- ფორუმი [infrance.su — „Административные и юридические вопросы"](https://www.infrance.su/forum/forumdisplay.php?f=25) — ყველაზე ღრმა ru-არქივი; thread-ები: „Что можно с récépissé?" (**41 გვერდი**), „Как получить récépissé?", „Заполнение формуляра OFII", „Вопрос по CAF, OFII, ANAEM", „CAF, документы", „Получение carte vitale" `[fact, secondary]`.
- ru-ენოვანი **უფასო substitute-ები თავშესაფრის თემაზე უკვე არსებობს**: [exil-solidaire.fr (SPADA/GUDA, CMA/ADA რუსულად)](https://exil-solidaire.fr/cma-ada), [infrancer.com — ADA 2026](https://infrancer.com/france-ada.html), [Women for Women France — запрос убежища](https://www.womenforwomenfrance.org/ru/our-resources/residency-rights-in-france/how-to-apply/applying-for-asylum-in-france), Réfugiés.info (ru + uk) `[fact, secondary]`. **[estimate]** ru-სეგმენტში ჩვენი დიფერენციატორი „პროცედურა" ვერ იქნება — მხოლოდ „სად, ვისთან, ჩემი სტატუსით" დირექტორია.

### 1.3. ქართული სეგმენტი — სად იკრიბებიან

| არხი | ტიპი | ზომა | ტეგი | წყარო |
|---|---|---|---|---|
| ასოციაცია ქართველები საფრანგეთში / Géorgiens en France | FB page + Instagram | 9,612 like | `[fact, secondary]` | [facebook.com/georgiensenfrance](https://www.facebook.com/georgiensenfrance/) |
| GEORGIENS EN FRANCE (GF) ასოციაცია — გრენობლი | ასოციაცია: „ეხმარება თანამემამულეებს ადმინისტრაციულ პროცედურებში" | — | `[fact, secondary]` | [Grenoble.fr](https://www.grenoble.fr/association/129794/655-georgiens-en-france.htm) |
| SheniEmigranti.ge | მედია + „საუკეთესო ქართული ემიგრანტული ჯგუფები და ფორუმები" კატალოგი | 43k+ like | `[fact, secondary]` | [sheniemigranti.ge](https://sheniemigranti.ge/%E1%83%A1%E1%83%90%E1%83%A3%E1%83%99%E1%83%94%E1%83%97%E1%83%94%E1%83%A1%E1%83%9D-%E1%83%A5%E1%83%90%E1%83%A0%E1%83%97%E1%83%A3%E1%83%9A%E1%83%98-%E1%83%94%E1%83%9B%E1%83%98%E1%83%92%E1%83%A0%E1%83%90/) |
| **kartuli.fr** — „პირველი ქართული საინფორმაციო პორტალი საფრანგეთში" | გიდები: სამუშაო ნებართვა თავშესაფრის მაძიებლებისთვის, დასაბრუნებელი მოწმობა… | — | `[fact, secondary]` — **ახალი, 02-ში არ არის** | [kartuli.fr](https://kartuli.fr/) |
| emigrantebi.ge / emigrantebi.org | მედია + თარგმანის სერვისი (ტელეფონი სათაურშივე); „საფრანგეთში თავშესაფრის მაძიებლის გზამკვლევი" | — | `[fact, secondary]` | [emigrantebi.org/france](https://emigrantebi.org/category/home/france/); [justfly.ge/6851](https://justfly.ge/archives/6851) |
| FB ჯგუფები „ქართველი ემიგრანტები", „ემიგრანტი დედების ჯგუფი" | ზოგადი (არა FR-სპეციფიკური) | — | `[unverified]` | [FB 235434743502214](https://www.facebook.com/groups/235434743502214/) |
| ეკლესია: წმ. თამარ მეფის ტაძარი (პარიზი), წმ. ქეთევანი (სტრასბურგი), ლევილი | offline hub + სამრევლო სკოლა | — | `[fact, secondary]` | [SheniEmigranti — ტაძრები საფრანგეთში](https://sheniemigranti.ge/%E1%83%A1%E1%83%90%E1%83%93-%E1%83%9B%E1%83%93%E1%83%94%E1%83%91%E1%83%90%E1%83%A0%E1%83%94%E1%83%9D%E1%83%91%E1%83%A1-%E1%83%A5%E1%83%90%E1%83%A0%E1%83%97%E1%83%A3%E1%83%9A%E1%83%98-%E1%83%A2/) |
| სახელმწიფო ka-რესურსი | „Guide du demandeur d'asile — GEORGIEN" (PDF, 2020) | — | `[fact]` | [nord.gouv.fr](https://www.nord.gouv.fr/contenu/telechargement/71829/441859/file/Guide_du_demandeur_d_asile_septembre2020_GEORGIEN.pdf) |

**[estimate]** ქართული Telegram-არხი საფრანგეთისთვის **არ ჩანს** — ka-სეგმენტი Facebook-ზეა (ჯგუფები + გვერდები) და მესენჯერებში; ეს ადასტურებს 01 §5-ის ვარაუდს „ნინო FB-ჯგუფებში კითხულობს". **[assumption]** დახურული FB-ჯგუფების წევრთა რაოდენობა (ათასობით, სავარაუდოდ 5–20k) მხოლოდ მფლობელს შეუძლია ნახოს ლოგინით — §5-ის ტესტისთვის საჭიროა.

### 1.4. ≥15 განმეორებადი კითხვა/საჭიროება (verbatim-სტილში, წყაროთი)

ინტერვიუების ნაცვლად — რას კითხულობენ რეალურად. „V" = verbatim სათაური/ფრაზა; „P" = პარაფრაზი წყაროს snippet-იდან.

| # | კითხვა / საჭიროება | ენა | დომენი (01 §6d) | წყარო |
|---|---|---|---|---|
| 1 | V „Что можно с récépissé?" (41 გვ.) | ru | legal_status | [infrance.su t=14824](https://www.infrance.su/forum/showthread.php?t=14824&page=41) |
| 2 | V „Как получить récépissé?" | ru | legal_status | [infrance.su t=24825](https://www.infrance.su/forum/showthread.php?t=24825) |
| 3 | V „Заполнение формуляра OFII" | ru | legal_status/daily_life | [infrance.su p=1060159331](https://www.infrance.su/forum/showthread.php?p=1060159331) |
| 4 | V „Вопрос по CAF, OFII, ANAEM" / „CAF, документы" | ru | money_benefits | [infrance.su t=60067](https://www.infrance.su/forum/showthread.php?t=60067), [t=20166](https://www.infrance.su/forum/showthread.php?t=20166) |
| 5 | V „Получение carte vitale" | ru | health | [infrance.su t=56952](https://www.infrance.su/forum/showthread.php?t=56952) |
| 6 | V „ADA — Размер пособия для беженцев во Франции в 2026 году" (რამდენია ADA?) | ru | money_benefits | [infrancer.com](https://infrancer.com/france-ada.html) |
| 7 | V „SPADA, GUDA — первые шаги при запросе убежища" | ru | legal_status | [exil-solidaire.fr](https://exil-solidaire.fr/spada-guda) |
| 8 | P ANEF „notorious for glitches" → „Besoin d'aide?", PAN (point d'accueil numérique) სად არის? | ru/all | daily_life | [The Local 2025-01](https://www.thelocal.fr/20250108/9-tips-for-dealing-with-frances-anef-website) |
| 9 | P „rendez-vous préfecture impossible / нет свободных" → რა ვქნა? | ru/all | legal_status | [village-justice](https://www.village-justice.com/articles/droit-des-etrangers-que-faire-cas-impossibilite-prise-rendez-vous-ligne-sur,39808.html), [Services Publics+](https://www.plus.transformation.gouv.fr/experiences/5417234_impossible-dobtenir-un-rendez-vous) |
| 10 | V „სამუშაო ნებართვა თავშესაფრის მაძიებლებისთვის საფრანგეთში — სრული გზამკვლევი" (6 თვის შემდეგ) | ka | work_income | [kartuli.fr/travail](https://kartuli.fr/travail/) |
| 11 | V „საქართველოში დასაბრუნებელი მოწმობა" (პასპორტის გარეშე როგორ დავბრუნდე) | ka | legal_status/consular | [kartuli.fr/returntogeorgia](https://kartuli.fr/returntogeorgia/) |
| 12 | V „საფრანგეთში თავშესაფრის მაძიებლის გზამკვლევი (ქართულად)" | ka | legal_status | [justfly.ge/6851](https://justfly.ge/archives/6851) |
| 13 | V „რა პირობებში უწევთ ცხოვრება თავშესაფრის მაძიებელ ქართველებს საფრანგეთში" | ka | housing | [justfly.ge/6400](https://justfly.ge/archives/6400) |
| 14 | V „ფრანგულიდან თარგმნა — 577 546 577" / „დოკუმენტის თარგმნა და დამოწმება" (ფასიანი თარგმანის მოთხოვნა ka-სივრცეში) | ka | daily_life/translation | [emigrantebi.ge](https://emigrantebi.ge/%E1%83%A4%E1%83%A0%E1%83%90%E1%83%9C%E1%83%92%E1%83%A3%E1%83%9A%E1%83%98%E1%83%93%E1%83%90%E1%83%9C-%E1%83%97%E1%83%90%E1%83%A0%E1%83%92%E1%83%9B%E1%83%9C%E1%83%90/) |
| 15 | V „ოჯახი რომელსაც OQTF ჰქონდა დაადეპორტეს" (OQTF-ის შემდეგ რა ხდება?) | ka | legal_status/safety_rights | [georgiafnews.com](https://georgiafnews.com/index.php?newsid=1690) |
| 16 | V „რა ელით ქართველებს, რომლებიც სიმსივნეს საფრანგეთში მკურნალობენ" | ka | health | [Ambebi](https://www.ambebi.ge/article/325632-diax-bevri-mzime-pacientistvis-es-gvtiuri-manana/) |
| 17 | V „ქართველი ექიმები ემიგრანტებს უფასო დახმარებას სთავაზობენ — სია მედიკოსების მონაცემებით" (ka-ენოვანი ექიმის პოვნა) | ka | health | [Ambebi](https://www.ambebi.ge/article/243129-kartveli-ekimebi-emigrantebs-upaso-daxmarebas-stav/) |
| 18 | V „სად მდებარეობს ქართული ტაძრები საფრანგეთში — სრული ჩამონათვალი" | ka | community_social | [SheniEmigranti](https://sheniemigranti.ge/%E1%83%A1%E1%83%90%E1%83%93-%E1%83%9B%E1%83%93%E1%83%94%E1%83%91%E1%83%90%E1%83%A0%E1%83%94%E1%83%9D%E1%83%91%E1%83%A1-%E1%83%A5%E1%83%90%E1%83%A0%E1%83%97%E1%83%A3%E1%83%9A%E1%83%98-%E1%83%A2/) |
| 19 | P „Si des Géorgiens viennent à Strasbourg, c'est pour ne pas mourir" — სასწრაფო მკურნალობა + სქვოტი/ბანაკი = health + housing ერთდროულად | ka (fr წყარო) | health+housing | [Rue89 Strasbourg](https://www.rue89strasbourg.com/pourquoi-georgiens-viennent-strasbourg-250674) |
| 20 | P „Sans-papiers, demandeurs d'asile: à quelles aides médicales avez-vous droit?" (AME vs PUMa სტატუსით) | all | health | [InfoMigrants](https://www.infomigrants.net/fr/post/17194/sanspapiers-demandeurs-dasile--a-quelles-aides-medicales-avezvous-droit-en-france) |

**[estimate] დასკვნა:** 20-დან 11 — `legal_status` (récépissé, OFII, préfecture RDV, ANEF, OQTF, დაბრუნება), 4 — `health`, 3 — `money_benefits`, 2 — `daily_life/translation`, 1 — `housing`, 1 — `community`, 1 — `work_income`. **ხალხი ეძებს ინსტიტუტისა და დოკუმენტის სახელით** (récépissé, OFII, CAF, ANEF, AME, carte vitale), არა „დომენით". ეს პირდაპირი მოთხოვნაა Phase 2-ის `procedures`-ისთვის და ძიების სინონიმებისთვის (01 §6b).

---

## 2. ტაქსონომიის შემოწმება (card sort-ის ჩანაცვლება)

მეთოდი: 11 დომენის ka/ru label-ები (01 §6d + დღევანდელი `client/src/i18n/ka.ts`/`ru.ts` `cat*`/`need*` სტრინგები) შევადარე §1.4-ის ლექსიკას და ka/ru substitute-საიტების მენიუებს (kartuli.fr, exil-solidaire.fr, infrancer.com, Réfugiés.info ru). `[estimate]` თითოეულზე.

| # | domain | დღევანდელი/შემოთავაზებული ka | ru | ემთხვევა ხალხის სიტყვებს? | შესწორება |
|---|---|---|---|---|---|
| 1 | legal_status | „ვიზა / ბინადრობის ნებართვა" (`needVisa`) | „Виза / ВНЖ" | **ნაწილობრივ** — ხალხი ამბობს „საბუთები", „თავშესაფარი", „récépissé", „პრეფექტურა" | ka: **„საბუთები და სტატუსი (თავშესაფარი, ბინადრობა)"**; ru: **„Документы и статус (убежище, titre de séjour)"**; ქვე-ლეიბლები ფრანგული აკრონიმებით უცვლელად: OFPRA, CNDA, récépissé, OQTF, ANEF |
| 2 | housing | „საცხოვრებელი" | „Жильё" | ✅ | ქვე-ლეიბლი „115 / სასწრაფო თავშესაფარი", „CADA/HUDA" |
| 3 | health | „სამედიცინო მკურნალობა" (`catMedicalTreatment`) | „Медицинское лечение" | **არა** — „მკურნალობა" გრანტების ენაა; ხალხი ეძებს „ექიმი", „AME", „carte vitale", „უფასო კლინიკა" | ka: **„ჯანმრთელობა და ექიმი"**; ru: **„Здоровье и врачи"**; ქვე: AME/PUMa, PASS, ქართულენოვანი ექიმი |
| 4 | mental_health | (არ არსებობს) | — | ტერმინი ka-სივრცეში სტიგმატიზებულია | ka: **„ფსიქოლოგი და მხარდაჭერა"** (არა „ფსიქიკური ჯანმრთელობა"); ru: „Психолог и поддержка" |
| 5 | language_education | „ენა / თარჯიმანი" (`needLanguage`) — თარჯიმანი ერევა | „Язык / переводчик" | **ნაწილობრივ** | გაყავი: ka **„ფრანგულის სწავლა და განათლება"**; თარჯიმანი → #11 |
| 6 | work_income | (grants: „ბიზნეს დაფინანსება") | — | არა | ka: **„სამუშაო და ნებართვა"** (kartuli.fr-ის ლექსიკა: „სამუშაო ნებართვა"); ru: „Работа и разрешение на работу" |
| 7 | money_benefits | „ფინანსური დახმარება", „საბანკო / ფინანსური" | „Финансовая помощь" | **ნაწილობრივ** — ხალხი ამბობს „ADA", „CAF", „ბარათი" | ka: **„შემწეობა და ფული (ADA, CAF, ბანკი)"**; ru: „Пособия и деньги (ADA, CAF, банк)" |
| 8 | family_children | — | — | — | ka: „ოჯახი, ბავშვები, სკოლა"; ru: „Семья, дети, школа" — ✅ ბუნებრივი |
| 9 | community_social | („community") | — | ✅ თუ სახელით: „ეკლესია, ასოციაციები, თანამემამულეები" | ka: **„ქართველები და ეკლესია"** (SheniEmigranti-ს ლექსიკა) — ru: „Русскоязычные организации и церковь" |
| 10 | safety_rights | — | — | აბსტრაქტულია; ხალხი ამბობს „OQTF", „დაკავება", „ძალადობა" | ka: **„უფლებები, OQTF, დაცვა"**; ru: „Права, OQTF, защита" |
| 11 | daily_life | „ტრანსპორტი", „მგზავრობა და ტრანსპორტი" | „Путешествия и транспорт" | **არა** — „მგზავრობა/Путешествия" ტურისტულია | ka: **„ყოველდღიური: თარჯიმანი, ტელეფონი, ტრანსპორტი"**; ru: „Быт: переводчик, телефон, транспорт" |

**ვერდიქტი:** 9/11 გასაგებია შესწორებული label-ით; 2 (`safety_rights`, `daily_life`) label-ის სრულ გადაწერას ითხოვს. 1.1-ის კრიტერიუმი „card sort ≥9/11" ონლაინ-პროქსით **გავლილია პირობითად** `[estimate]` — რეალური card sort-ის გარეშე „გასაგებობა" ჩემი დასკვნაა, არა მომხმარებლის. **[assumption]** ფრანგული აკრონიმები (OFII, CAF, ANEF) ka/ru ტექსტში **უთარგმნელად** უნდა დარჩეს — ყველა ka/ru წყარო ასე აკეთებს.

---

## 3. მონაცემთა სიახლის baseline (cold-call-ის ჩანაცვლება)

**წყარო რეპოში:** `client/src/data/catalog.json` (629 ჩანაწერი, **0 საფრანგეთი**), `data/orgs-phase2.json` (538, 7 პარიზი, ყველა US-ორიენტირებული), `data/organizations-2026-04-20.xlsx` sheet „Organizations" (538 org, **16 საფრანგეთი**). 624 FR ორგანიზაცია (PROJECT_MAP) მხოლოდ prod DB-შია — sandbox-იდან მიუწვდომელი. `[fact]`

**კრიტიკული აღმოჩენა `[fact]`:** 16/16 FR ჩანაწერს xlsx-ში **Website = null, Phone = null, Email = null, Office Hours = null**. კატეგორია 14-ზე `medical_treatment`/`scholarships` — ინტეგრაციის დომენებთან კავშირი არ აქვს. „ორგანიზაციების" ნაწილი რეალურად **სქემაა, არა სტრუქტურა** (AME, PCH, FSL, Erasmus+).

5 შემოწმებული (WebFetch ყველგან დაბლოკილი → ვერიფიკაცია საძიებო snippet-ით, `[fact, secondary]`):

| org_id | ჩანაწერი რეპოში | ვებზე ნაპოვნი | მისამართი ემთხვევა? | ტელ/საათები ვებზე | ვერდიქტი |
|---|---|---|---|---|---|
| ORG-0024 | „Aide Médicale de l'État (AME)", Paris, 168 Rue de Grenelle 75007 | AME განაცხადი წარედგინება **CPAM-ს, CCAS-ს ან დეპარტამენტს**; 168 rue de Grenelle = მინისტერიის შენობა, არა მიღება ([ameli.fr](https://www.ameli.fr/assure/droits-demarches/situations-particulieres/situation-irreguliere-ame)) | ❌ | — | **არასწორი**: სქემა ჩაწერილია ორგანიზაციად, მისამართი შეცდომაში შეიყვანს |
| ORG-0030 | „Fonds Social de la CPAM", Paris, 21 Rue Georges Auric 75019 | CPAM Paris siège 21 rue Georges Auric; ტელ **36 46** ([pagesjaunes](https://www.pagesjaunes.fr/pros/61529289), [mappy](https://fr.mappy.com/poi/6266095bb8abae33696814cb)) | ✅ | ტელ ✅ (რეპოში null) | სწორი, **არასრული** |
| ORG-0031 | „Fonds de Solidarité pour le Logement (FSL)", Lormont, 2 Rue des Arts | GIP FSL **Gironde**, 2 rue des Arts CS 80002 33306 Lormont; ტელ **05 57 77 21 60**; ორშ–პარ 9–11:30/14–16, ხუთშ. ნაშუადღ. დაკეტილი ([fsl33.org](https://www.fsl33.org/contact/)) | ✅ | ✅ | სწორი, მაგრამ **სახელი არაზუსტია** (FSL დეპარტამენტულია — ჟირონდის FSL პარიზელს არ ეხმარება) |
| ORG-0034 | „La Ligue contre le cancer — Aide financière", Lille, 4/6 Rue Pierre Dupont | Comité du Nord, 4-6 rue Pierre Dupont 59013 Lille; ტელ **03 20 06 06 05**; cd59@ligue-cancer.net; ორშ–ხუთ 8:30–12:30/13:30–17 ([solidarites.lille.fr](https://solidarites.lille.fr/acteur/100/3-ligue-contre-le-cancer-comite-du-nord.htm)) | ✅ | ✅ | სწორი, არასრული; დეპარტამენტული კომიტეტია |
| ORG-0035 | „Mutuelle Solidaire", Roubaix, 6 Av. Jean Lebas | „Mutuelle Santé Solidaire", 6 av. Jean Lebas 59100; ტელ **09 72 63 39 60**; ორშ/ოთხ/პარ 9:30–12/13–18 ([trouver-ouvert](https://trouver-ouvert.fr/roubaix/mutuelle-sant%C3%A9-solidaire-1260296)) | ✅ | ✅ | სწორი, სახელი ოდნავ არასწორი; მხოლოდ რუბეს მაცხოვრებლებისთვის (eligibility არ არის ჩაწერილი) |

**Baseline `[estimate]`:** მისამართი სწორი 4/5; კონტაქტი რეპოში 0/5; სახელი/ტიპი ზუსტი 2/5; eligibility (ვისთვისაა) 0/5. 1.1-ის კრიტერიუმი „cold-call 5/5 პასუხობს" **ვერ იფარება** — ტელეფონზე პასუხს ვები ვერ ცვლის. რაც იფარება: **სტრუქტურული ხარისხის დიაგნოზი** — ჩვენი FR-მონაცემი 2026-04-20 ექსპორტში „სქემა ≠ ორგანიზაცია" შეცდომას შეიცავს და კონტაქტების გარეშეა. **[assumption]** prod DB-ის 624 FR ჩანაწერი (import-france-orgs.ts, 5 ენა) უკეთესია — ეს მენეჯერმა `pnpm audit:db`-ით უნდა შეამოწმოს, არა ამ ანგარიშმა.

---

## 4. WTP — ვინ იხდის (v2 დამატება)

### 4.1. ორგანიზაციები/ინსტიტუტები — რა არსებობს რეალურად

| Comparable | ვინ იხდის | რამდენი | ტეგი | წყარო |
|---|---|---|---|---|
| **Integreat** (DE) | კომუნა/Landkreis, Kooperationsvertrag | **€4,000–15,000/წ gross** ზომის მიხედვით; 50k სიტყვა თარგმანი უფასოდ; Fürth: **€25,000 / 5 წ (2024–29)**; შედარება: custom app €60–85k | `[fact]` (2 წყარო) | [integreat-app.de/kosten](https://integreat-app.de/kosten-fuer-den-integreat-betrieb/); [Fürth Stadtrat](https://stadtrat.fuerth.de/vo0050.asp?__kvonr=62352) |
| **Soliguide / Solinum** (FR) | დეპარტამენტები, CCAS, DDETS, ფონდები; FEDER Interreg „Solidigital" **€1.571M/3 წ**; „franchise associative" (7 ფრანჩაიზი 2024); Annemasse Agglo — convention de partenariat | ცალკე ფასი არ ქვეყნდება; ლისტინგი/ambassadeur **უფასო**; API უფასო | `[fact, secondary]` | [Avise](https://www.avise.org/actualites/mieux-connaitre-les-offres-de-financement-europeen-dediees-aux-entreprises-de-less-0); [Annemasse](https://www.annemasse-agglo.fr/infos-et-loisirs/actualites/signature-officielle-de-la-convention-de-partenariat-pour-le); [Solinum 2025](https://solinum.org/en/les-etudes-et-rapports/rapport-annuel-solinum-2025) (3.7M ძიება 2024, „€1 → €14.44 სოციალური ღირებულება") |
| **Réfugiés.info** (FR) | სახელმწიფო (DIAIR/DGEF/DINUM), Mednum | €0.60/ინფორმირებული 2025; 1.46M უნიკ. მომხმ. 2025 (+21%); სტრუქტურების fiches **უფასო** | `[fact, secondary]` | [beta.gouv.fr](https://beta.gouv.fr/startups/refugies.info.html); [refugies.info/mission](https://refugies.info/en/mission-and-impact) |
| **Handbook Germany : Together** (DE) | AMIF **90%** + BAMF + Berlin Senat + IRC; **€1,821,001 / 2023–25** | — | `[fact, secondary]` | [Bundestag hib](https://www.bundestag.de/presse/hib/kurzmeldungen-1024084); [NdM](https://neuemedienmacher.de/projekte/handbook-germany-together/) |
| **Findhelp** (US) | health systems / payers / states / counties — custom quote; **CBO-ს ლისტინგი და claim = $0** | ფასი გვერდზე არ ქვეყნდება | `[fact, secondary]` | [company.findhelp.com/pricing](https://company.findhelp.com/pricing/); [claim](https://company.findhelp.com/solutions/cbos/claim-your-program/) |
| **Turn2us** (UK) | adviser account **უფასო** ორგანიზაციებისთვის | £0 | `[fact]` | [turn2us.org.uk](https://www.turn2us.org.uk/services-for-organisations/use-our-tools) |
| **Watizat** (FR) | დონაცია: „€2 = ერთი გიდის ბეჭდვა"; 1,400 გიდი/თვე; 0 ოპერაციული ხარჯი | — | `[fact, secondary]` | [Helloasso](https://www.helloasso.com/associations/watizat/formulaires/1) |
| **FAMI/AMIF FR 2025** (DGEF, BOP 104 action 12) | დეპარტამენტული/რეგიონული appels à projets ყოველწლიურად (მაისი) | პროექტები ტიპურად €100–500k (05 §4.3); ინდივიდუალური საბუთები ვერ გავხსენი | `[fact, secondary]` | [DGEF appels](https://www.immigration.interieur.gouv.fr/les-fonds-affaires-interieures/appels-a-projets); [Marne AAP 2024](https://www.marne.gouv.fr/Publications/Appels-a-projets-consultations/Appels-a-projets/Appel-a-projets-2024-Programme-104-integration-des-etrangers-primo-arrivants) |
| **ინტერპრეტაცია — რაც ორგანიზაციები რეალურად ყიდულობენ** | OFII marché: lot 3 „famille de langues caucasiennes (**géorgien, tchétchène**)", 6 თვე + reconduction ≤18 თვე; ISM Interprétariat (150 მთარგმნელი, 80 ენა); ბაზრის ტარიფი ≈**€25/სთ**; Coallia — contrats-cadres interprétariat | — | `[fact, secondary]` | [centraledesmarches OFII](https://centraledesmarches.com/marches-publics/Office-Francais-de-l-Immigration-et-de-l-Integration-Prestations-d-interpretariat-telephonique-et-de-traduction-de-documents/3921118); [ISM](https://ism-interpretariat.fr/traduction/) |

**დასკვნა Org Pro €300–900/წ-ზე `[estimate]`:**
- **პირდაპირი comparable არ არსებობს.** ბაზარი ორნაირია: (ა) ლისტინგი/claim/adviser — **ყველგან €0**; (ბ) ინსტიტუციური ლიცენზია — **€4k+/წ** (Integreat), ხშირად გრანტით/სახელმწიფოთი დაფარული. €300–900 არც ერთ კატეგორიაშია — ეს „მიკრო-SaaS" ფასია, რომელსაც ასოციაციები ვერ იხდიან ლისტინგისთვის (რადგან Soliguide/Réfugiés.info უფასოა) და ინსტიტუტები ვერ ყიდულობენ შესყიდვის გარეშე.
- **დამაჯერებელია მხოლოდ ერთი ჩარჩოთი:** „ka/ru ფენა = ინტერპრეტაციის ხარჯის ჩანაცვლება". OFII-ს ცალკე ქართული lot აქვს; ასოციაციები €25/სთ იხდიან. €450/წ ≈ **18 საათი თარჯიმანი** — თუ ka-კიტი (მარშრუტი + საბუთების სია + ტელეფონის სკრიპტი) წელიწადში ≥18 საათს ზოგავს CADA-ს, გადაწყვეტილება რაციონალურია. ეს არის §5-ის B2B ტესტის მესიჯი.
- **ვინ წყვეტს / რომელი ბიუჯეტი `[assumption]`:** CADA/HUDA-ში — chef de service / directeur d'établissement (ოპერატორის დონეზე Coallia/Adoma — direction régionale); ბიუჯეტის ხაზი: „prestations d'interprétariat" ან „frais de fonctionnement" prix de journée-ს ფარგლებში (CADA ≈ dotation d'État), **არა FAMI** (FAMI პროექტულია, 18–30 თვე). CCAS — élu délégué + directeur; PASS — cadre de santé საავადმყოფოს ბიუჯეტიდან. **ეს ონლაინ ვერ დადასტურდება — 1.1-ის „3 ორგ-პასუხი" ღია რჩება.**

### 4.2. `/health-abroad` concierge €290/€590

| Comparable | მოდელი | ფასი | ტეგი | წყარო |
|---|---|---|---|---|
| Bookimed | კლინიკის კომისია; პაციენტისთვის **უფასო**; დეპოზიტი ჩაითვლება მკურნალობაში | €0 პაციენტს | `[fact, secondary]` | [bookimed finance policy](https://us-uk.bookimed.com/doc/finance-policy/) |
| PlacidWay / facilitator-ები | flat fee **$1,500–5,000/მოგზაურობა** ან % პაკეტში; საავადმყოფო facilitator-ს $30–35k-ს უწერს $25k პროცედურაზე | — | `[fact, secondary]` | [medicaltourismpackages.com](https://www.medicaltourismpackages.com/what-is-a-medical-tourism-facilitator/); [M. Todd, LinkedIn](https://www.linkedin.com/pulse/real-truth-medical-tourism-prices-abroad-maria-k-todd-mha-phd) |
| BE FREE (GE→TR) | ქართველ პაციენტებს თურქეთის კლინიკებში — შუამავალი | კომისიური (სავარაუდოდ) | `[unverified]` | [GHN](https://ghn.ge/news/173276) |
| მოთხოვნის სიგნალი GE | „ქართველი პაციენტები ძირითადად თურქეთში, გერმანიაში, ისრაელში მიდიან"; სახელმწიფო პროგრამა: **300 ბავშვი, 30M ლარი** — თურქეთი/ისრაელი/ესპანეთი; JAMnews „სამკურნალოდ თურქეთში"; „საშუალო ხელფასი 1500 ლარი, პენსია 260 — თურქეთში მკურნალობის საშუალება ბევრს არ აქვს" | — | `[fact, secondary]` | [chapidze.ge](https://chapidze.ge/news/116--.html); [Interpressnews](https://www.interpressnews.ge/ka/article/763319-jandacvis-ministris-gancxadebit-onkologiuri-daavadebebis-mkone-bavshvebis-mkurnaloba-saxelmcipos-dapinansebit-turketshi-espanetsa-da-israelshi-ikneba-shesazlebeli/); [JAMnews](https://project.jam-news.net/samkurnalod_turketshi) |
| საფრანგეთი კონკრეტულად | „საფრანგეთი არ არის ქართველი ავადმყოფების #1 მიმართულება"; „titre de séjour pour soins"-ის უმეტესობა ახლა უარყოფილია | — | `[fact, secondary]` | [Sciences Po](https://www.sciencespo.fr/ecole-droit/fr/actualites/droit-au-sejour-et-problematiques-de-sante-des-ressortissants-georgiens/) |

**დასკვნა `[estimate]`:** ფასი €290/€590 **ბაზრის ქვემოთაა 3–10×** და „კომისია 0" პოზიცია რეალურად დიფერენცირებულია (Bookimed/facilitator-ები კომისიით ცხოვრობენ). მაგრამ **გადამხდელი მოთხოვნა საფრანგეთის მიმართულებით ონლაინ სუსტია**: ქართული ოჯახების ფული თურქეთისკენ მიდის, საფრანგეთისკენ — თავშესაფრის/AME-ს გზა (რომელიც ჩვენს no-monetization zone-შია). **[assumption]** concierge-ს აზრი აქვს მხოლოდ US/DE/TR მიმართულებით (`grants.targetDiagnosis` მონაცემი აშშ-ზეა), არა FR — D20-ის გადახედვისას ეს უნდა ითქვას. „M5 ცივია" fallback-ის ალბათობა 4 კვირაში: მაღალი.

### 4.3. ru-relocant WTP landing (0/€5/€15)
ონლაინ ევიდენსი: ru-სეგმენტს **სამი უფასო, ღრმა substitute** აქვს (infrance.su 20+ წლიანი არქივი, exil-solidaire.fr, Réfugiés.info ru/uk) `[fact, secondary]`. **[estimate]** €5/€15 გადახდა ინფოზე ru-სივრცეში ≈0; ტესტი ღირს მხოლოდ თუ landing „ადამიანს" ყიდის (30-წუთიანი ka/ru კონსულტაცია), არა ტექსტს — ეს კი 05-ის M5/M0 ლოგიკის გარეთაა.

---

## 5. Fake-door-ის ჩანაცვლება — 1-საათიანი, €0 ტესტი (**არ დაპოსტილა**)

**პრინციპი:** არა Google Form + PDF (გადამისამართება ჯგუფებში ხშირად spam-ად იბლოკება), არამედ **„ვინ დამეხმარება" ბუნებრივი პოსტი + კომენტარებით ზომვა**. 1 საათი = 2 პოსტი + 48 სთ შემდეგ დათვლა.

**სად (ka):** მფლობელის ლოგინით — SheniEmigranti-ს კატალოგიდან 1–2 ყველაზე დიდი FR-ჯგუფი (წევრთა რიცხვი იქვე ჩაიწერება — §1.3-ის ღია რიცხვი ივსება) + „ასოციაცია ქართველები საფრანგეთში"-ის პოსტის კომენტარები. **სად (ru):** `@RUSSIAN_in_FRANCE` ან „Русские в Париже" (ჩატის წესები ჯერ წაიკითხოს — რეკლამა იკრძალება; ამიტომ ტექსტი კითხვაა, არა ბმული).

**ტექსტი ka (პოსტი, ბმულის გარეშე):**
> გამარჯობა ყველას. ვამზადებ **უფასო ქართულენოვან სიას** — სად წავიდე საფრანგეთში პირველ 30 დღეში: OFII, პრეფექტურა, ADA-ს ბარათი, უფასო ექიმი, თარჯიმანი, სასწრაფო თავშესაფარი — ქალაქების მიხედვით (პარიზი, რეიმსი, ლიონი, სტრასბურგი). ორი კითხვა: **1) რომელი ქალაქი გაინტერესებთ? 2) რა იყო ყველაზე რთული საბუთი/ადგილი, რომ იპოვეთ?** ვისაც უნდა, კომენტარში დაწერეთ „მინდა" — გავუზიარებ, როცა მზად იქნება.

**ტექსტი ru:**
> Всем привет. Собираю **бесплатный список на русском** — куда идти в первые 30 дней во Франции: OFII, préfecture, карта ADA, бесплатный врач, переводчик, экстренное жильё — по городам (Париж, Реймс, Лион, Страсбург). Два вопроса: **1) какой город вам нужен? 2) что было сложнее всего найти?** Кому нужно — напишите «+» в комментариях, пришлю, когда будет готово.

**რას ვზომავთ (48 სთ):** (a) „მინდა/+" კომენტარები = fake-door sign-up-ის ეკვივალენტი (1.1-ის ზღვარი **≥30** რჩება); (b) ქალაქების განაწილება (რეიმსის ჰიპოთეზა D5); (c) „ყველაზე რთული" პასუხები = §1.4-ის სია რეალური ხმებით (≥10 = ინტერვიუების მინიმალური ჩანაცვლება); (d) DM-ები; (e) ჯგუფის წევრთა რიცხვი. **B2B-ვარიანტი (WTP):** იგივე 1 საათში — 3 e-mail CADA/HUDA სოცმუშაკს (Coallia/Adoma/Croix-Rouge Reims) ერთი კითხვით: „ქართულენოვანი მარშრუტის კიტი (საბუთები + სად წავიდეს + ტელეფონის სკრიპტი) წელიწადში რამდენ საათ ინტერპრეტაციას დაგიზოგავდათ? ვინ გადაწყვეტდა €450/წ-ს?" — ეს ერთადერთი გზაა 1.1-ის „3 ორგ-პასუხის" დასაფარად.

**რისკი `[assumption]`:** ka-ჯგუფებში პოსტი „სიის" შესახებ შეიძლება მოდერატორმა კომერციულად ჩათვალოს — ამიტომ ბმული და ბრენდი პოსტში არ არის.

---

## 6. ვერდიქტის ცხრილი — 1.1-ის done-when vs ონლაინ

| 1.1 კრიტერიუმი (MASTER-PLAN v2 §5) | რა იპოვა ონლაინ კვლევამ | Confidence | რაც ადამიანის გარეშე ვერ გაიგება |
|---|---|---|---|
| **≥5 ინტერვიუ** (ბოლო 30 დღის ძიების ეპიზოდი) | 20 განმეორებადი კითხვა/საჭიროება ka/ru წყაროებიდან (§1.4); დომინირებს legal_status → health → money; ხალხი ინსტიტუტის სახელით ეძებს | **საშუალო** — თემები სანდოა, ინტენსივობა/რიგი არა | „რა იყო არასწორი, ვინ უპასუხა" — ინდივიდუალური ეპიზოდი; ემოციური ხარჯი; მობილური vs დესკტოპი; ენდობა თუ არა საიტს |
| **Card sort ≥9/11** | 9/11 ბუნებრივი შესწორებული label-ით; 2 გადასაწერი; ფრანგული აკრონიმები უცვლელად (§2) | **საშუალო-დაბალი** — ჩემი ლექსიკური შედარებაა, არა მომხმარებლის დახარისხება | რომელ დომენში „ჩააგდებს" მომხმარებელი AME-ს (health თუ money?) და OQTF-ს (legal თუ safety?) |
| **Fake-door ≥30 ან „<30" ჩაწერილი** | ტესტი შედგენილია (§5), **არ გაშვებულა**; არხების სია და ru-substitute-ები დადგენილია | **არ იფარება** | sign-up/გაზიარების რიცხვი; ჯგუფების ზომა (ლოგინი სჭირდება) |
| **Cold-call 5/5** | რეპოს FR-ექსპორტი: 16 ჩანაწერი, 0 კონტაქტი; 5-დან 4 მისამართი სწორი, 1 არასწორი (AME), 2 „სქემა ≠ ორგანიზაცია"; ტელ/საათები ვებიდან დაემატა (§3) | **ნაწილობრივი** — სტრუქტურული ხარისხი დიაგნოსტირებულია; „ტელეფონი პასუხობს?" — არა | უპასუხებს თუ არა ტელეფონი; მიიღებენ თუ არა ka-სპიკერს; რეალური საათები vs ვებ-გვერდი |
| **WTP: 3 ორგ-პასუხი (yes/no/ვინ წყვეტს)** | ბაზარი: ლისტინგი €0 ყველგან; ლიცენზია €4–15k/წ (Integreat); Org Pro €300–900 — comparable არ არსებობს; დამაჯერებელი მხოლოდ „ინტერპრეტაციის ჩანაცვლების" ჩარჩოთი (OFII-ს ქართული lot, €25/სთ); concierge €290/590 ბაზრის ქვემოთ, მაგრამ FR-მოთხოვნა სუსტი (§4) | **დაბალი** WTP-ზე, **მაღალი** „ვინ არ იხდის"-ზე | yes/no; ვინ წყვეტს; ბიუჯეტის ხაზი; sales cycle — **ეს არის ერთადერთი, რაც მხოლოდ საუბრით გაიგება**; §5-ის 3 e-mail მინიმუმია |

**რეკომენდაცია მენეჯერისთვის (Tamar):** 1.1 ჩაითვალოს **„დაფარულია ონლაინ 2/5, ნაწილობრივ 1/5, ღია 2/5"**. ღია 2 (fake-door, WTP-პასუხები) მფლობელის 1 საათს ითხოვს (§5) — გეგმის დანარჩენი Phase 1 (1.2 hero copy, 1.3+ ) ამაზე არ არის დამოკიდებული და შეიძლება გაგრძელდეს. D20 (concierge) — რეკომენდაცია: FR-მიმართულება ამოიღოს, US/TR დარჩეს ტესტად.

---

## 7. ვარაუდები და რაც ვერ გადავამოწმე

- `[assumption]` OFPRA-ს 2024/2025 ზუსტი ქართული რიცხვები — ofpra.gouv.fr/lacimade.org დაბლოკილი; მხოლოდ რანგები (მე-7 2023, მე-10 2025) და EU-ს 15,509 (2024).
- `[assumption]` Telegram/FB ჯგუფების წევრთა რაოდენობა — არც ერთი ვერ წავიკითხე; §5 ავსებს.
- `[assumption]` Integreat-ის €4–15k დიაპაზონი ორი წყაროთი დასტურდება (integreat-app.de snippet + Fürth €25k/5წ = €5k/წ) — ეს 02 §5-ის ციფრს ამყარებს.
- `[assumption]` 624 FR ორგანიზაციის ხარისხი prod-ში — არ ვიცი; რეპოს ექსპორტი (16, 0 კონტაქტი) შეიძლება მოძველებული snapshot იყოს.
- `[unverified]` kartuli.fr-ის მფლობელი, ტრაფიკი, მონეტიზაცია — გვერდი დაბლოკილი; **ეს არის ყველაზე ახლო ka-კონკურენტი/პარტნიორი და 02-ში უნდა დაემატოს.**
