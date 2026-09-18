# 01 — ემიგრანტების ინტეგრაციის საჭიროებები: განმარტება, მომხმარებელი, მოგზაურობა, სერვის-მოდელი

> ავტორი: Ezra (Product Researcher, migrant integration) · თარიღი: 2026-09-18
> სტატუსი: კვლევა/დეფინიცია — კოდის ცვლილება არ არის. მართვისთვის: ფაქტები ციტირებულია `[n]`-ით (§9); ჩემი შეფასებები მონიშნულია **[შეფასება]**-ით.
> კონტექსტი: GrantKit → org-centric pivot (2026-04-23), მფლობელის ციტატა: „ეს საიტი არ არის მხოლოდ გრანტებზე"; საფრანგეთი = პირველი ღრმა ქვეყანა (624 ორგ, 102 housing ჩანაწერი, `emigrationPurpose` = all/study/medical/work).

---

## 1. რას ნიშნავს „ემიგრანტების ინტეგრაციის მხარდაჭერა"

### 1.1. დამკვიდრებული ჩარჩოები

| ჩარჩო | რას ამბობს | რატომ გვჭირდება |
|---|---|---|
| **Ager & Strang (2008)** — Journal of Refugee Studies [1] | 10 დომენი 4 ჯგუფად: **Markers & Means** (დასაქმება, საცხოვრებელი, განათლება, ჯანმრთელობა); **Social Connection** (bonds — თანამემამულეები, bridges — მასპინძელი საზოგადოება, links — ინსტიტუტები); **Facilitators** (ენა/კულტურული ცოდნა, უსაფრთხოება/სტაბილურობა); **Foundation** (უფლებები და მოქალაქეობა) | ყველაზე ციტირებული ოპერაციული მოდელი; პირდაპირ გვაძლევს ტაქსონომიის ხერხემალს (§6d) |
| **UK Home Office Indicators of Integration 2019** (Ndofor-Tah, Strang, Phillimore და სხვ.) [2] | იგივე მოდელი 14 დომენამდე გაფართოვდა: დაემატა leisure, health & social care, **digital skills**, language & communication, culture, stability | „digital skills" ცალკე facilitator-ია — ე.ი. ციფრული პლატფორმა თავად არის ინტეგრაციის ინსტრუმენტი, მაგრამ ციფრული გამორიცხვაც რეალურია |
| **EU Common Basic Principles (2004, reaffirmed 2014)** [3] | 11 პრინციპი; ინტეგრაცია = „two-way process of mutual accommodation" მიგრანტებსა და მასპინძელ საზოგადოებას შორის; მოიცავს დასაქმებას, განათლებას, ინსტიტუტებზე/სერვისებზე წვდომას | პოლიტიკური ლეგიტიმაცია: ინფორმაციაზე წვდომა EU-ს მიერ აღიარებული ინტეგრაციის ნაწილია |
| **Zaragoza indicators (2010)** [4] | 4 სფერო: employment, education, social inclusion, active citizenship; Eurostat ყოველწლიურად | გვაძლევს „შედეგის" მეტრიკებს — ის, რასაც პლატფორმა ვერ ზომავს, მაგრამ უნდა ემსახურებოდეს |
| **OECD/EU „Settling In 2023"** [5] | 87 ინდიკატორი 8 თავში (შრომის ბაზარი, ცხოვრების პირობები, ჯანმრთელობა, სამოქალაქო ჩართულობა…); დასკვნა: შრომის ბაზარი უმჯობესდება, ცხოვრების პირობები — არა | საცხოვრებელი და ცხოვრების პირობები არის დაჩამორჩენილი დომენი — ეს ემთხვევა GrantKit-ის housing მონაცემებს |
| **MIPEX 2025** [6] | 8 პოლიტიკის სფერო (labour market mobility, family reunification, education, political participation, permanent residence, nationality, anti-discrimination, health); **საფრანგეთი = 56/100, „Temporary Integration"** — საბაზისო უფლებები, მაგრამ არა უსაფრთხო მომავალი | სწორედ „temporary integration" ქვეყანაში ინფორმაცია ხდება კრიტიკული: უფლებები არსებობს, მაგრამ პროცედურულად რთულად მისაწვდომია |
| **EU Action Plan on Integration and Inclusion 2021–2027** [7] | 4 სვეტი: employment, education, health, housing + ხუთი cross-cutting, მათ შორის **digital tools for integration** | პლატფორმის ტიპის სერვისი ცალსახად პოლიტიკის ჩარჩოშია |
| **UNHCR** [8] | local integration = ლეგალური, ეკონომიკური, სოციალური და კულტურული პროცესი, რომელიც კულმინაციას მოქალაქეობით აღწევს; „ორმხრივი", საკუთარი იდენტობის უარყოფის გარეშე | ლტოლვილთა კონტექსტში ინტეგრაცია ≠ ასიმილაცია — ოფიციალურად |
| **IOM Glossary** [9] | „two-way process of mutual adaptation… არ გულისხმობს აუცილებლად მუდმივ ცხოვრებას; გულისხმობს სერვისებსა და შრომის ბაზარზე წვდომას" | დროებითი მიგრანტიც (სტუდენტი, სამედიცინო) ინტეგრაციის სუბიექტია — ეს ამართლებს `emigrationPurpose=study/medical`-ს |

### 1.2. რა არ არის ინტეგრაცია

- **ინტეგრაცია ≠ ასიმილაცია.** Berry-ის (1997) აკულტურაციის მოდელში [10] ინტეგრაცია = მშობლიური კულტურის შენარჩუნება **და** მასპინძელ საზოგადოებაში მონაწილეობა; ასიმილაცია = მშობლიურის დათმობა; სეპარაცია = მხოლოდ დიასპორაში ცხოვრება; მარგინალიზაცია = არცერთი. პროდუქტული შედეგი: საიტმა უნდა გააძლიეროს **bridges და links** (მასპინძელი ინსტიტუტები, ფრანგული სერვისები) და არა მხოლოდ **bonds** (ქართული ჯგუფები) — თორემ ის სეპარაციას ემსახურება.
- **ინტეგრაცია ≠ ჰუმანიტარული დახმარება.** Relief = სიცოცხლის შენარჩუნება (თავშესაფარი, საკვები, გადაუდებელი მკურნალობა), მოკლე ჰორიზონტი, provider-driven. ინტეგრაცია = მონაწილეობა, გრძელი ჰორიზონტი, ორმხრივი. **[შეფასება]** GrantKit-ის 102 housing ჩანაწერი და „free clinic" ველები relief-ზონაშია; ეს აუცილებელი შესასვლელია, მაგრამ თუ საიტი მხოლოდ იქ დარჩა — ის Soliguide-ის [17] სუსტი ასლი იქნება, არა ინტეგრაციის პლატფორმა.

### 1.3. რას შეუძლია ინფორმაციული/დირექტორიული პლატფორმა და რას — არა

Ager & Strang-ის ენით:

| ჯგუფი | პლატფორმას შეუძლია | პლატფორმას არ შეუძლია (ადამიანი სჭირდება) |
|---|---|---|
| Markers & Means | „სად, რა პირობით, რა საბუთით" — წვდომის ხარჯის შემცირება; უფლებამოსილების პირველადი შემოწმება | დასაქმება, ბინის მიღება, მკურნალობა თავად |
| Social Connection | **links**: ინსტიტუტების/ორგანიზაციების ხილვადობა და სანდოობის სიგნალები; bridges-ის მისამართები (ასოციაციები, სპორტი, მოხალისეობა) | bonds/bridges თავად — ურთიერთობა, ნდობა, მენტორობა |
| Facilitators | ორიენტაცია, პროცედურების ახსნა მშობლიურ ენაზე, ციფრული „გზამკვლევი" | ენის სწავლება, ტრავმის თერაპია, უსაფრთხოების უზრუნველყოფა |
| Foundation | უფლებების მარტივი ახსნა სტატუსის მიხედვით; „სად მივიღო უფასო იურიდიული დახმარება" | იურიდიული წარმომადგენლობა, საქმის მართვა (case management), ინდივიდუალური რჩევა |

**[შეფასება]** რეალისტური წილი: პლატფორმა ამცირებს **ძიების და ორიენტაციის ხარჯს** — ეს არის Lloyd et al.-ის „information landscape"-ში ნავიგაცია [14] და Wall et al.-ის „information precarity"-ს შემცირება [13]. კვლევა ერთმნიშვნელოვნად ამბობს, რომ ციფრული ინსტრუმენტი ინსტიტუციური/ადამიანური მხარდაჭერის გარეშე საკმარისი არ არის [20]. ამიტომ სწორი პოზიციონირება: „**ვინ დაგეხმარება და როგორ მიხვიდე მასთან**" — არა „ჩვენ დაგეხმარებით".

---

## 2. ვინ არის ემიგრანტი — სტატუსები და რატომ აქვს მნიშვნელობა

სტატუსი განსაზღვრავს (ა) რა სერვისზე აქვს **უფლება**, (ბ) რა **ვადებში**, (გ) რა **რისკია** არასწორი ნაბიჯის დროს. ეს არის ერთადერთი ღერძი, რომლის გარეშეც „ორგანიზაციების დირექტორია" ემიგრანტისთვის უსარგებლოა: `acceptsUndocumented` უკვე ამის აღიარებაა schema-ში.

| სტატუსი | EU (საფრანგეთის მაგალითი) — რაზე აქვს წვდომა | US — რაზე აქვს წვდომა | რა ინფორმაცია სჭირდება სხვანაირად |
|---|---|---|---|
| **თავშესაფრის მაძიებელი** (asylum seeker) | ADA დახმარება (≈€6.80/დღე ერთ ადამიანზე [24]); CADA/HUDA საცხოვრებელი შეზღუდულია; ჯანდაცვა (PUMa) **მხოლოდ 3 თვის შემდეგ**, მანამდე მხოლოდ გადაუდებელი [25]; **მუშაობა მხოლოდ თუ OFPRA-მ 6 თვეში არ გადაწყვიტა** და ნებართვა (2022: 27% დამტკიცება, ანუ 0.8% მაძიებელთა) [23]; **საქართველო „safe country"-ს სიაშია 2013-დან → accelerated procedure** [26] | ფედერალური ბენეფიტები არა; EAD 150/180 დღის შემდეგ [27]; Emergency Medicaid, EMTALA, FQHC sliding-scale [28]; ბავშვები — სკოლა | „რა შემიძლია **ახლა**, ლოდინის დროს" — უფასო კლინიკა, საკვები, თავშესაფარი; ვადების კალენდარი; რას ნიშნავს accelerated procedure ქართველისთვის |
| **ლტოლვილი / subsidiary protection** | 10-წლიანი (ლტოლვილი) ან 4-წლიანი (subsidiary) ბარათი; სრული სამუშაო უფლება; PUMa; **CIR** — ფრანგული A2-მდე (100–600 სთ), 24 სთ civic; 2026-01-01-დან A2 სავალდებულოა pluriannuelle ბარათისთვის [29]; ENIC-NARIC დიპლომის შედარება **უფასოდ** [30]; Réfugiés.info-ს სამიზნე [16] | Resettled refugees: სამუშაო უფლება დაუყოვნებლივ, R&P 90 დღე, RMA/RCA შეზღუდული თვეები, Medicaid | „როგორ გავხდე დამოუკიდებელი 12 თვეში": ენა, კვალიფიკაცია, ბინა (DALO, Action Logement), სამსახური |
| **შრომითი მიგრანტი** (salarié, passeport talent) | სამუშაო ბარათი დამსაქმებელზე; ჯანდაცვა; ოჯახის გაერთიანება პირობებით; ენა თავიდან არა, A2 2026-დან | H-1B/L-1 და სხვ.; დამსაქმებლის დაზღვევა; სტატუსი ვიზაზეა მიბმული | ბიუროკრატიის „კრიტიკული გზა": titre de séjour განახლება, CAF, საგადასახადო; ბანკი; ბინა გარანტორის გარეშე |
| **სტუდენტი** | სტუდენტური ბარათი; ნაწილობრივი მუშაობის უფლება (≈964 სთ/წელი — შესამოწმებელი); CROUS; სტუდენტური ჯანდაცვა | F-1: მხოლოდ campus, ბენეფიტები არა | „როგორ დავრჩე სწავლის შემდეგ" (RECE, APS); იაფი საცხოვრებელი; ჯანდაცვა |
| **ოჯახის გაერთიანება** | CIR სავალდებულო; სამუშაო უფლება; დამოკიდებულია სპონსორზე | ოჯახური ვიზები; conditional residence | ენა + დამოუკიდებლობა (GBV რისკი, დამოკიდებული სტატუსი) |
| **დაურეგისტრირებელი / sans-papiers** | **AME** 3 თვის რეზიდენციის შემდეგ, შემოსავალი ≤ ≈€10,339/წელი [31]; PASS საავადმყოფოს კონსულტაციები; ბავშვები — სკოლა; რეგულარიზაცია: admission exceptionnelle, „étranger malade" | Emergency Medicaid, EMTALA, FQHC; K-12; ITIN; შტატების მიხედვით ვარიაცია [28] | **ესპანეთი: arraigo 2 წლის შემდეგ (2025-05-20-დან)** [32] — ერთ-ერთი რეალური „გამოსავალი"; „ვის მივმართო რომ არ გამცეს" — ნდობის სიგნალები |
| **დროებითი დაცვა (უკრაინა)** | დაუყოვნებლივ ბინადრობა, მუშაობა, ჯანდაცვა, სკოლა; გახანგრძლივდა 2028-03-მდე; **4.43 მლნ EU-ში 2026-07** (43% ზრდასრული ქალი, 29% ბავშვი) [33] | US: U4U parole | ყველაზე კარგად უზრუნველყოფილი სეგმენტი ოფიციალური ინფორმაციით; საჭიროებები: ენა, ფინანსური მხარდაჭერა, დასაქმება [34] |
| **უკან დაბრუნებული** (returnee, საქართველოში) | IOM AVRR; ქართული სახელმწიფო პროგრამები | — | საფრანგეთის საიტისთვის out of scope; ქართველი დამფუძნებლისთვის — მომავალი ვერტიკალი |

**[შეფასება]** GrantKit-ის `emigrationPurpose` (study/medical/work) აღწერს **მოტივს**, არა **სტატუსს**. ეს ორი განსხვავებული ღერძია: სამედიცინო მოტივით ჩამოსული ქართველი შეიძლება იყოს ტურისტი (90 დღე უვიზოდ), თავშესაფრის მაძიებელი (accelerated) ან „étranger malade" განმცხადებელი — და სამივეს სხვადასხვა კლინიკა/თავშესაფარი ხელმისაწვდომი აქვს. საჭიროა ცალკე `eligibleStatuses` ველი (§6c).

---

## 3. ინტეგრაციის მოგზაურობა ეტაპებად

| ეტაპი | ტოპ საჭიროებები (დომენებით) | კონკრეტული კითხვები, რომელსაც მომხმარებელი სვამს |
|---|---|---|
| **0. გამგზავრებამდე** | ლეგალური სტატუსი; ფული; ჯანმრთელობა (თუ სამედიცინო მოტივია); მოლოდინების კორექცია | „უვიზოდ 90 დღე — მერე რა?"; „რა ღირს მკურნალობა და ვინ გადაიხდის?"; „სად ცხოვრობენ ქართველები/რუსულენოვნები?"; „რა საბუთი წავიღო თარგმნილი/აპოსტილით?"; „რამდენი ფული მჭირდება პირველი 3 თვისთვის?" |
| **1. ჩამოსვლა (0–3 თვე)** | **სტატუსი/საბუთები** (GUDA, OFPRA, préfecture); **თავშესაფარი**; **ჯანმრთელობა** (3-თვიანი ფანჯარა PUMa/AME-მდე → PASS, უფასო კლინიკები); საკვები; ტელეფონი/ინტერნეტი; უსაფრთხოება; ბავშვების სკოლა | „სად დავრჩე ამაღამ ბავშვთან ერთად?"; „სად მიმიღებენ ექიმთან დაზღვევის/საბუთის გარეშე?"; „115-ს რომ ვურეკავ, არ პასუხობს — სხვა გზა?"; „რომელი ორგანიზაცია ლაპარაკობს ქართულად/რუსულად?"; „domiciliation სად?"; „რა ვადა მაქვს ANEF/GUDA-სთვის?" |
| **2. დამკვიდრება (3–12 თვე)** | **ენა** (CIR, ასოციაციების კურსები); **ფული/ბენეფიტები** (ADA, CAF, ბანკი); **საცხოვრებელი** (CADA→DALO→social); ჯანმრთელობა (PUMa/AME რეგისტრაცია, ქრონიკული); **ბავშვები** (სკოლა, კრეში); ფსიქიკური ჯანმრთელობა; მობილობა (Navigo solidarité) | „PUMa/AME რომ მომეცა, სად ვიპოვო médecin traitant?"; „უფასო ფრანგული სად, რომელ დღეებში?"; „ბანკის ანგარიში récépissé-ით?"; „CAF-ის APL შემიძლია?"; „ფსიქოლოგი ქართულად/რუსულად?"; „ბავშვს სკოლაში მიღება ურჩევენ — რა საბუთით?" |
| **3. ინტეგრაცია (1–5 წელი)** | **სამუშაო + კვალიფიკაციის აღიარება** (ENIC-NARIC, VAE, Pôle emploi/France Travail); სტაბილური ბინა; სტატუსის განახლება/pluriannuelle (A2!); ოჯახის გაერთიანება; სოციალური კავშირები (bridges); ფინანსური სტაბილურობა | „დიპლომი აქ რას ნიშნავს?"; „ექთანი/ექიმი ვარ — როგორ ვიმუშაო პროფესიით?"; „A2 ტესტი სად ჩავაბარო?"; „ბიზნესის დაწყება titre-ით შეიძლება?"; „ბინა გარანტორის გარეშე — Visale?" |
| **4. გრძელვადიანი (5+ წელი)** | მუდმივი ბინადრობა/მოქალაქეობა (B1); სამოქალაქო მონაწილეობა; ბავშვების უმაღლესი; ორმაგი მოქალაქეობა; დაბრუნების გადაწყვეტილება | „naturalisation-ის პირობები?"; „პენსია/სტაჟი საქართველოდან?"; „მშობლების ჩამოყვანა?" |

ჯვარედინი (ყველა ეტაპზე): **უსაფრთხოება/უფლებები** (დისკრიმინაცია, პოლიცია, ტრეფიკინგი, GBV), **ფსიქიკური ჯანმრთელობა** (WHO: მიგრანტები მოწყვლად სიტუაციაში უარეს ჯანმრთელობის შედეგებს აჩვენებენ; სტატუსი ზღუდავს წვდომას [35]).

**[შეფასება]** GrantKit-ის მონაცემები (medical treatment + 102 სამედიცინო თავშესაფარი) ყველაზე ძლიერია **ეტაპ 1-ზე** ერთი ქვე-სეგმენტისთვის (სამედიცინო მოტივი). ეტაპ 2–3 (ენა, სამუშაო, კვალიფიკაცია, CAF) — ამჟამად თითქმის არ არის დაფარული, ხოლო სწორედ ის არის „ინტეგრაცია" ყველა ჩარჩოს მიხედვით.

---

## 4. საჭიროებების კვლევა — რას ამბობს ევიდენსი

| # | დასკვნა | წყარო |
|---|---|---|
| 1 | ტელეფონი და ინტერნეტი ლტოლვილებისთვის „ისეთივე სასიცოცხლოა, როგორც საკვები, წყალი და თავშესაფარი"; ბარიერი — ღირებულება და დაფარვა (44 ქვეყანა) | UNHCR/Accenture, *Connecting Refugees* (2016) [11] |
| 2 | სირიელი/ერაყელი ლტოლვილები მაღალ ციფრულ წიგნიერებას აჩვენებენ; **Facebook — ყველაზე გამოყენებული წყარო**; ნდობა მეინსტრიმ მედიისადმი დაბალია; WhatsApp — პრივატულობისთვის; შიში ზედამხედველობის | Gillespie et al., *Mapping Refugee Media Journeys* (OU/France Médias Monde, 2016) [12] |
| 3 | სოციალური მედიის ინფორმაცია ხელმისაწვდომია, მაგრამ **სიმართლის შემოწმება** ცენტრალური პრობლემაა; ნდობა ძლიერ კავშირებს (ნათესავები, ნაცნობები) | Dekker, Engbersen, Klaver, Vonk, *Smart Refugees* (54 ინტერვიუ, NL, 2018) [15] |
| 4 | ინფორმაცია უფრო **კომუნიკაციით** (ნაცნობებთან) მოიპოვება, ვიდრე ძიებით; საძიებო სისტემები მეორადი როლით | Emmer, Kunst, Richter (2020) [19] |
| 5 | „**Information precarity**": არასტაბილური, არარელევანტური, ზოგჯერ საშიში ინფორმაცია; დარღვეული სოციალური მხარდაჭერა | Wall, Otis Campbell, Janbek, *New Media & Society* (2017) [13] |
| 6 | ლტოლვილები ახალ „information landscape"-ს **სოციალური და ვიზუალური** წყაროებით სწავლობენ; **სერვის-პროვაიდერები = მედიატორები/ნავიგატორები** | Lloyd et al., *Journal of Documentation* (2013) [14] |
| 7 | სანდოობა: **word of mouth პირველ ადგილზეა, Facebook — ახლო მეორე** (~1/3 ენდობა); სახელმწიფო ინფორმაცია ნაკლებად სანდოა, ადგილობრივი მხარდამჭერი ჯგუფები — მეტად | Mixed Migration Centre, *Hype or hope?* [18] |
| 8 | უკრაინელები გერმანიაში/პოლონეთში ინფორმაციას ძირითადად **Telegram ჯგუფებში** ცვლიან; თვითორგანიზაცია; პარალელურად — ანტი-ლტოლვილური დეზინფორმაცია იმავე არხებზე | De Gruyter თავი (Telegram channels of Ukrainian migrants in Germany); ML ანალიზი Telegram-ზე; DFRLab (2022) [21] |
| 9 | ციფრული ბარიერები: ინფრასტრუქტურა, უნარები, ენა, **eID-ის არქონა**; სერვისების online-ზე გადატანა გამორიცხავს ნაწილს | MPG policy brief (2023) [22]; MPI (2023) [20] |
| 10 | ციფრული წიგნიერებაც კი საკმარისი არ არის ინსტიტუციური/სოციალური მხარდაჭერის გარეშე — ბიუროკრატიული სისტემა ვერ „გაიარება" მარტო ტელეფონით | IJOC 19 (2025), *Digital Literacy, Information Precarity…* [20] |
| 11 | საფრანგეთის სახელმწიფო პლატფორმა Réfugiés.info-ს **დასაბუთება**: „მუდმივი საკანონმდებლო ცვლილება, მრავლდება ორგანიზაციები, ადმინისტრაციული სირთულე" → ცენტრალიზებული, განახლებული ინფო; 8 ენა (fr, uk, fa, ar, en, ps, ru, ti) — **ქართული არ არის** | DIAIR / OECD blog [16] |
| 12 | Soliguide: 27,600+ სტრუქტურა, უფასო, ანონიმური, ფილტრები „sans-papiers", „ღიაა დღეს", PMR; ჩატი 200+ ენაზე | Solinum [17] |
| 13 | Watizat: ყოველთვიურად განახლებული **ბეჭდური** გზამკვლევი (fr/en/ar/ps/fa) — ბეჭდვა თავად არის პასუხი ციფრულ გამორიცხვაზე და ინფორმაციის მოძველებაზე | Watizat [17b] |
| 14 | IRC Signpost: **მოდერატორები თავად ლტოლვილები**, ორმხრივი კომუნიკაცია Facebook Messenger-ით; 2018: 11,000 მომხმარებელი, 94,200 შეტყობინება | IRC [17c] |
| 15 | უკრაინელთა საჭიროებები (EUAA/OECD SAM-UKR): ენა, ფინანსური მხარდაჭერა, დასაქმება; ზომიერი კმაყოფილება სერვისებით | EUAA [34] |

**სად არის ევიდენსი თხელი (და ამას აქვს მნიშვნელობა GrantKit-ისთვის):**
- **ქართველი ემიგრანტების ინფორმაციული ქცევა** — რეცენზირებული კვლევა ვერ ვიპოვე; ვიცით მხოლოდ მოტივი (სამედიცინო) და მასშტაბი: 2018-ში ~7,000 ქართველმა ითხოვა თავშესაფარი საფრანგეთში, უმეტესად მკურნალობის იმედით [36]; 2022-ში 8,099 პირველი განაცხადი [37]; 2025-ში საქართველო ისევ ტოპ-10-შია [26]. (OFPRA-ს 2024/25 ზუსტი რიცხვები პირველწყაროდან ვერ გადავამოწმე — egress-ით დაბლოკილი; მოწმდება ხელით.)
- **გადახდის მზაობა (WTP)** ინფორმაციულ სერვისზე მიგრანტებში — კვლევა არ არსებობს; ზოგადი freemium-ლიტერატურა მხოლოდ „perceived value"-ზე ლაპარაკობს. **[შეფასება]** ყველა ძლიერი კონკურენტი უფასოა (Réfugiés.info, Soliguide, Watizat, Signpost) — ეს ფასს არა კონკურენციულ, არამედ ეთიკურ კითხვად აქცევს (§8).
- **რუსულენოვანი რელოკანტების** ინფორმაციული ქცევა — CASE/OutRush აღწერს დემოგრაფიას (43% IT; გერმანია > საფრანგეთი > ესპანეთი [38]), არა ინფორმაციულ არხებს; ანეკდოტურად Telegram-ცენტრულია.

---

## 5. პერსონები

| | **ნინო** | **გიორგი** | **ოლენა** | **დმიტრი** | **სოფი** (შუამავალი) |
|---|---|---|---|---|---|
| **სიტუაცია** | 38 წ., ქართველი, რეიმსი; 9 წლის შვილს ონკოლოგიური მკურნალობა სჭირდება; ფრანგული — არა, რუსული — ცოტა | 29 წ., ქართველი, ბარსელონა; მშენებლობაზე მუშაობს არაფორმალურად 14 თვეა | 34 წ., უკრაინელი, ლიონი; ორი ბავშვი; ბუღალტერი | 31 წ., რუსი IT-ინჟინერი, პარიზი/ვალენსია; passeport talent / nomad | 45 წ., ფრანგი სოციალური მუშაკი ასოციაციაში (რეიმსი), 30% ბენეფიციარი ქართველია |
| **სტატუსი** | თავშესაფრის მაძიებელი, accelerated („safe country") | sans-papiers → arraigo-ს ელოდება (2 წ.) | დროებითი დაცვა | ლეგალური შრომითი მიგრანტი | — |
| **ეტაპი** | ჩამოსვლა (0–3 თვე) | დამკვიდრება → ინტეგრაცია | დამკვიდრება (3–12 თვე) | გამგზავრებამდე → ჩამოსვლა | — |
| **ტოპ-3 JTBD** | 1) ვინ მიმიღებს ბავშვს ექიმთან PUMa-მდე; 2) სად ვიცხოვრო საავადმყოფოსთან ახლოს ბავშვთან (childrenFriendly!); 3) რას ნიშნავს accelerated და რა ვადებია | 1) arraigo-ს საბუთების სია და ვინ დამეხმარება უფასოდ; 2) უფასო კლინიკა empadronamiento-თი; 3) შრომითი უფლებები ლეგალური ხელშეკრულების გარეშე | 1) ბავშვების სკოლა + ფრანგული; 2) დიპლომის აღიარება (ENIC-NARIC უფასოა) და სამსახური პროფესიით; 3) ბინა hosting-ის დასრულების შემდეგ | 1) ბანკი + ბინა გარანტორის გარეშე; 2) ჯანდაზღვევა/mutuelle; 3) საგადასახადო რეზიდენცია, titre განახლება | 1) ქართულენოვანი მასალა ბენეფიციარებისთვის; 2) სანდო, განახლებული სია ვინ იღებს sans-papiers-ს; 3) ბენეფიციარისთვის „მარშრუტის" გაზიარება |
| **არხები** | ქართული Facebook ჯგუფები, Viber/WhatsApp, ნათესავები, ეკლესია | TikTok/Facebook, Viber, თანამშრომლები | Telegram (ქალაქის ჩატები), Réfugiés.info, სკოლა | Telegram რელოკაციის ჩატები, YouTube, Notion-გიდები | პროფესიული ქსელი, Soliguide, Réfugiés.info, ტელეფონი |
| **ნდობის ფაქტორები** | ვინც ქართულად ლაპარაკობს; „სხვა ქართველმა გამოსცადა"; არა სახელმწიფო ლოგო | თანამემამულის გამოცდილება; ადვოკატის რეპუტაცია | ოფიციალური + მოხალისე ჯგუფები (ორივე) | რეიტინგები, სისწრაფე, სპეციფიკა | წყაროს მითითება, განახლების თარიღი, ტელეფონი რომელიც პასუხობს |
| **გადახდის უნარი/მზაობა** | **ძალიან დაბალი** (ADA ≈€200/თვე); $9/თვე = ADA-ს 4–5%; შესაძლოა ერთჯერადი/ნათესავის მიერ | დაბალი-საშუალო; ფულს ადვოკატზე ხარჯავს; $9 გადაიხდის თუ arraigo-ს „გზამკვლევი" კონკრეტულია | დაბალი; უფასო ალტერნატივები უხვია | **მაღალი** — რელოკაციის სერვისებზე ასობით ევროს ხარჯავს | **B2B**: ასოციაცია/მუნიციპალიტეტი — ლიცენზია/გრანტი, არა subscription |

### 5.1. „ქართველი ემიგრანტი საფრანგეთში" — სწორი beachhead-ია?

**რა უჭერს მხარს (ფაქტები):** საქართველო ტოპ-10 წარმოშობის ქვეყანაა თავშესაფრის განაცხადებში 2025-ში [26]; მოტივი დომინანტურად სამედიცინოა [36] — ზუსტად GrantKit-ის ისტორიული ძალა (medical + 102 სამედიცინო თავშესაფარი); **არცერთი ოფიციალური პლატფორმა (Réfugiés.info, Soliguide) არ არის ქართულად** [16][17]; 624 ორგანიზაცია უკვე შეგროვებულია; დამფუძნებელი ენობრივად და ქსელურად „insider"-ია.

**რა ეწინააღმდეგება (ფაქტები + შეფასება):** (1) მასშტაბი: ქართული დიასპორა საფრანგეთში ~15k (2017) [39]; შედარებით — საბერძნეთი ~200k, იტალია/გერმანია ~50k, ესპანეთი ~25k [40]; (2) accelerated procedure → სწრაფი უარი, OQTF, დროებითობა → **მაღალი churn**; (3) WTP ≈ 0 და ეთიკური რისკი ADA-ზე მცხოვრებისთვის paywall-ის დადებაში; (4) სამედიცინო-მოტივიანი ჯგუფი პოლიტიკურად სენსიტიურია (France24: „AME-ს აბუზი" ნარატივი [36]) — რეპუტაციული რისკი.

**ალტერნატივები და trade-off-ები [შეფასება]:**

| ვარიანტი | + | − |
|---|---|---|
| A. ქართველები საფრანგეთში (მიმდინარე) | მონაცემები მზადაა; ენობრივი მონოპოლია; სწრაფი ვალიდაცია | პატარა, ღარიბი, დროებითი სეგმენტი; შემოსავალი ≈ 0 |
| B. ქართველები საბერძნეთში/იტალიაში/ესპანეთში | 10× მეტი დიასპორა; ესპანეთში arraigo = ძლიერი JTBD | 0 ორგანიზაცია ბაზაში; ახალი ქვეყნის კვლევა |
| C. რუსულენოვანი რელოკანტები (FR/ES/DE) | მაღალი WTP; Telegram-ით მისაწვდომი; საიტს რუსული აქვს | გადატვირთული ბაზარი (რელოკაციის სააგენტოები, Telegram-გიდები); პოლიტიკური სენსიტიურობა ქართული ბრენდისთვის |
| D. უკრაინელები (TP) | უდიდესი სეგმენტი (4.43 მლნ) | უფასო ოფიციალური ინფო უხვად; უკრაინული ენა არ გვაქვს |
| E. **შუამავლები (B2B/B2G):** ასოციაციები, CCAS, სოციალური მუშაკები, დიასპორის ორგანიზაციები | Lloyd: პროვაიდერები = ნავიგატორები [14]; ერთი კლიენტი = ასობით ბენეფიციარი; რეალური ბიუჯეტი (FAMI/AMIF გრანტები) | გაყიდვის ციკლი გრძელია; საჯარო შესყიდვები |

**რეკომენდაცია [შეფასება]:** A დარჩეს **ვალიდაციის** beachhead-ად (იაფია, insider-უპირატესობა), მაგრამ არა **შემოსავლის** beachhead-ად. შემოსავლის ჰიპოთეზა ჯერ E-ზე და C-ზე შემოწმდეს. „ქართველი საფრანგეთში" უნდა გახდეს **reference implementation** — ერთი ენა × ერთი ქვეყანა × ერთი მოგზაურობა ბოლომდე — რომელიც მერე კოპირდება.

---

## 6. როგორ დაეხმარება ეს საიტი ინტეგრაციაში — სერვის-მოდელი

### 6a. რა უნდა გააკეთოს პლატფორმამ

1. **ორიენტაცია სტატუსი × ეტაპის მიხედვით** — შესვლისას 3 კითხვა (ქვეყანა, სტატუსი, რამდენი ხანია აქ ხარ) → პერსონალიზებული „პირველი 30 დღე" ჩეკლისტი. არსებული onboarding (`purposes/needs`) ამას ნაწილობრივ აკეთებს, მაგრამ **სტატუსის კითხვა აკლია**.
2. **სანდო ორგანიზაციების დირექტორია წვდომის სიგნალებით** — ის, რაც უკვე schema-შია (`languages`, `acceptsUndocumented`, `acceptsUninsured`, `serviceCost`, `appointmentPolicy`, housing-ის `childrenFriendly/disabledAccessible/maxStayDuration`) + სიახლის/ვერიფიკაციის სიგნალი (Watizat-ის ყოველთვიური განახლების ლოგიკა [17b]).
3. **ნაბიჯ-ნაბიჯ პროცედურები** (AME, PUMa, CIR, ENIC-NARIC, arraigo…): წინაპირობა → საბუთები → სად → ვადა → რა მოხდება მერე → ვინ დაგეხმარება (ორგანიზაციის ბმულით). Réfugiés.info-ს „fiche"-ის ანალოგი, მაგრამ ქართულად და ორგანიზაციებთან დაკავშირებული.
4. **„ვინ ლაპარაკობს ჩემს ენაზე"** — ენობრივი ფილტრი პირველ ადგილას (ნინოს ნდობის #1 ფაქტორი).
5. **Link-out, არა დუბლირება**: Soliguide/Réfugiés.info/service-public ბმულები, სადაც ისინი უკეთესია; GrantKit-ის ღირებულება = ენა + სტატუს-ფილტრი + მოგზაურობის ლოგიკა.
6. **გაზიარებადი მარშრუტი** (checklist-ის ბმული WhatsApp/Viber/Telegram-ში) — ევიდენსი ამბობს, რომ ინფო ნაცნობებით ვრცელდება [19][12]; ეს არის distribution-ის მექანიზმიც.
7. **ბეჭდვადი ვერსია** (PDF, A4) ნაწილისთვის ვინც ციფრულად გამორიცხულია [22][17b].

### 6b. რა არ უნდა სცადოს

- იურიდიული რჩევა/წარმომადგენლობა, საქმის მართვა, თერაპია, ენის სწავლება, ბინის მიწოდება, თარგმანის ოფიციალური სერვისი.
- „უფლებამოსილების გარანტია" — მხოლოდ „სავარაუდოდ გაქვს/არ გაქვს + ვისთან გადაამოწმო".
- ინდივიდუალური AI-ჩატი იურიდიულ/სამედიცინო კითხვებზე ადამიანური escalation-ის გარეშე (information precarity-ს გამრავლება).
- გრანტების „აგრეგატორობა" ინდივიდებისთვის მთავარ ღირებულებად — მფლობელმა ეს უკვე დახურა.

### 6c. საჭიროება → მონაცემთა მოდელი

| საჭიროება (§3) | არსებული ველი/ერთეული | საჭირო ახალი | Out of scope |
|---|---|---|---|
| სტატუსი/საბუთები | `emigrationPurpose` (მოტივი, არა სტატუსი); `targetAudience` (free-text) | **`eligibleStatuses`** CSV enum (asylum_seeker, refugee, undocumented, student, worker, family, temporary_protection, any); **`procedures`** ერთეული (steps, documents, prerequisites, deadlines, links, `lastVerifiedAt`, `country`, `status[]`); org↔procedure ბმა | წარმომადგენლობა |
| საცხოვრებელი | `organization_housing` (type, capacity, maxStay, childrenFriendly, disabledAccessible, registrationProcess, costDetails) | `womenOnly`/`familiesAccepted`/`petsAllowed`; `emergencyAccess` (bool: 115/walk-in) | ბინის მინიჭება |
| ჯანმრთელობა | `acceptsUninsured`, `acceptsUndocumented`, `serviceCost`, `appointmentPolicy`, `officeHours` | `interpreterAvailable` (yes/no/phone); `specialties` (CSV); `emergency24h` | სამედიცინო რჩევა |
| ენა | `languages` (org-ის ენები) | `serviceDomains` ⊇ language_course; კურსის დონე/გრაფიკი (free-text ან ცალკე `programs`) | სწავლება |
| სამუშაო/კვალიფიკაცია | — (grants-ში `scholarships`) | domain `work_income`; პროცედურა ENIC-NARIC/VAE; `remoteAvailable` | job matching |
| ბავშვები/განათლება | `childrenFriendly` (housing) | domain `family_children`; `ageRange` org-დონეზე (grants-ში უკვე არსებობს) | — |
| ფული/ბენეფიტები | `serviceCost` | პროცედურები (ADA, CAF, ბანკი); domain `money_benefits` | ფინანსური რჩევა |
| სოციალური კავშირი | `socialMedia` | domain `community_social`; `diasporaOrg` (bool) | მენტორობა |
| ფსიქიკური ჯანმრთელობა | — | domain `mental_health`; `interpreterAvailable` | თერაპია |
| უსაფრთხოება/უფლებები | — | domain `safety_rights`; `emergencyAccess` | — |
| მობილობა/ყოველდღიური | — | domain `daily_life`; `nearestTransit` (optional) | — |
| ნდობა/სიახლე | `googleRating/Count`, `phoneVerifiedAt`, `emailVerifiedAt`, `contactEnrichmentStatus` | **`lastVerifiedAt` org-დონეზე + `verifiedBy`**; „community confirmed" counter | — |

### 6d. ინტეგრაციის დომენების ტაქსონომია (11 დომენი)

| # | domain (key) | subdomains | Ager&Strang ჯგუფი | ძველი კატეგორიების mapping |
|---|---|---|---|---|
| 1 | `legal_status` | asylum, residence_permit, regularization, citizenship, legal_aid, consular | Foundation | (ახალი; `individual` ნაწილობრივ) |
| 2 | `housing` | emergency_shelter, temporary, social_housing, rental_support, medical_stay | Markers | `housing` |
| 3 | `health` | primary_care, free_clinic, insurance_access, hospital_specialist, dental, maternity, disability, medication | Markers | `medical_treatment`, `assistive_technology`, `individual` (medical grants) |
| 4 | `mental_health` | psych_support, trauma, addiction, peer_support | Markers/Facilitator | (ახალი) |
| 5 | `language_education` | language_course, civic_training, adult_education, digital_skills, higher_education | Facilitator | `educational`, `scholarships` (ნაწილი) |
| 6 | `work_income` | job_search, qualification_recognition, vocational_training, entrepreneurship, labour_rights | Markers | `startup`, `business_funding`, `research` |
| 7 | `money_benefits` | allowances, banking, food_aid, emergency_cash, debt | Markers | `financial_assistance`, `food_basic_needs` |
| 8 | `family_children` | school_enrollment, childcare, minors, family_reunification, women_gbv | Markers/Foundation | (ახალი) |
| 9 | `community_social` | diaspora_org, faith, sport_culture, volunteering, mentoring | Social Connection | `community` |
| 10 | `safety_rights` | anti_discrimination, violence, trafficking, detention_return | Facilitator/Foundation | (ახალი) |
| 11 | `daily_life` | transport, phone_internet, translation_interpreting, documents | Facilitator | `travel_transport` |
| — | (მოიხსნას) | | | `international` → country/`isNational`; `other` → unknown; `all` → UI-only |

**[შეფასება]** ერთ ორგანიზაციას რამდენიმე დომენი აქვს (CSV, როგორც ახლა `categories`); `mainCategory` (9 მნიშვნელობა France-იმპორტიდან) ამ 11-ზე უნდა დამაპდეს ერთი ცხრილით. ეს ცვლილება არ არღვევს grants-ს — `grants.category` შეიძლება იმავე ტაქსონომიაზე გადავიდეს ან პროგრამად დარჩეს ორგანიზაციის ქვეშ.

---

## 7. წარმატების კრიტერიუმები მომხმარებლის თვალით

**შედეგები (გაზომვადი):**
1. „ვიპოვე უფასო კლინიკა, რომელიც დაზღვევის გარეშე მიღებს, ჩემს ქალაქში, ≤5 წუთში" — task success ≥80% მოდერირებულ ტესტში.
2. „ვიცი რა 3 საბუთი მჭირდება AME-სთვის და სად წავიდე" — ≥80% სწორად ასახელებს ტესტის შემდეგ.
3. „დავურეკე ორგანიზაციას საიტიდან და ტელეფონმა უპასუხა / ინფო სწორი იყო" — ≥90% ვერიფიცირებული კონტაქტი; „არასწორი ინფოს" რეპორტი <5%.
4. „ჩეკლისტი გავუზიარე სხვას" — share-rate ≥15% სესიებზე, სადაც ჩეკლისტი გაიხსნა (distribution-ის სიგნალი).
5. „დავბრუნდი 30 დღეში" — D30 retention სტატუს-ეტაპ 1–2 მომხმარებლებში (ბენჩმარკი არ არსებობს; დავადგინოთ პირველი კოჰორტით).
6. შუამავლისთვის: „ამ სიით ბენეფიციარს 1 ვიზიტი დავუზოგე" — თვისებრივი, 5 სოციალურ მუშაკთან.

**იაფი ვალიდაცია (2–3 კვირა, ≈€0–300):**
- **5–8 ინტერვიუ** (45 წთ, ქართულად/რუსულად): 3 ქართველი ეტაპ 1–2-ზე (რეიმსი/პარიზი; რეკრუტინგი Facebook ჯგუფებიდან და ქართული ეკლესიიდან პარიზში), 2 რუსულენოვანი რელოკანტი, 2–3 სოციალური მუშაკი/მოხალისე ასოციაციიდან. გაიდი: ბოლო 30 დღის რეალური „ძიების ეპიზოდი" (რა ეძებე, სად, ვინ უპასუხა, რა იყო არასწორი).
- **Card sort** 11 დომენზე (ქართულად) 5 ადამიანთან — ტაქსონომიის სახელები გასაგებია?
- **Fake-door ტესტი** ორ Facebook ჯგუფში: „უფასო ქართულენოვანი გზამკვლევი — პირველი 30 დღე საფრანგეთში" (Google Form + PDF) — sign-up და გაზიარების რაოდენობა.
- **5 ორგანიზაციის cold-call** ბაზიდან — ტელეფონი პასუხობს? ინფო ემთხვევა? (მონაცემთა სიახლის baseline).
- **WTP ტესტი** მხოლოდ დმიტრი-პერსონაზე (Telegram ჩატი): landing 3 ფასით (0/€5/€15).

---

## 8. ღია კითხვები მფლობელისთვის

1. **მისია vs. შემოსავალი:** გვინდა paywall ADA-ზე მცხოვრები თავშესაფრის მაძიებლისთვის? ალტერნატივები: (ა) B2C უფასო + B2B/B2G ლიცენზია; (ბ) freemium — დირექტორია უფასო, პროცედურები/ჩეკლისტები ფასიანი; (გ) donor/AMIF გრანტით დაფინანსება (ეს GrantKit-ის საკუთარ კომპეტენციაშია).
2. **ბრენდი:** „GrantKit" სახელი გრანტებზე მიუთითებს; org-centric ინტეგრაციის საიტს სხვა სახელი სჭირდება? (გადაწყვეტილება მარკეტინგის ანგარიშთან ერთად.)
3. **სტატუსის კითხვა onboarding-ში:** მზად ვართ ვკითხოთ „sans-papiers ხარ?" — privacy/ნდობის ხარჯი vs. პერსონალიზაციის სარგებელი. ანონიმური რეჟიმი სავალდებულოა?
4. **ვინ აახლებს მონაცემებს?** Watizat ყოველთვიურად, Soliguide — ქსელით. ჩვენი მოდელი: AI-scraper + community confirm + სოციალური მუშაკების რედაქტორობა? ბიუჯეტი/დრო?
5. **სამედიცინო-მოტივიანი ქართველები = ღიად სამიზნე?** რეპუტაციული რისკი საფრანგეთის პოლიტიკურ დისკურსში vs. რეალური საჭიროება.
6. **ქვეყნების რიგი:** საფრანგეთის შემდეგ — ესპანეთი (arraigo + 25k ქართველი + რუსულენოვნები) თუ საბერძნეთი (200k ქართველი, ენა არ გვაქვს)?
7. **ენების რიგი:** უკრაინული დავამატოთ (TP სეგმენტი) თუ არა? ქართული რჩება #1 დიფერენციატორად?
8. **AI-ასისტენტი (`ai.grantChat`):** ვაგრძელებთ ინდივიდუალურ პასუხებს იურიდიულ/სამედიცინო კითხვებზე? თუ კი — რა disclaimer და escalation?
9. **ბეჭდური/offline ვერსია** — ამას ვინ და როგორ ავრცელებს (ასოციაციები? ეკლესია?).

---

## 9. წყაროები

1. Ager, A. & Strang, A. (2008). Understanding Integration: A Conceptual Framework. *Journal of Refugee Studies* 21(2). https://doi.org/10.1093/jrs/fen016 · https://www.researchgate.net/publication/31174952_Understanding_Integration_A_Conceptual_Framework
2. Ndofor-Tah, C., Strang, A., Phillimore, J. et al. (2019). *Home Office Indicators of Integration framework 2019*. https://assets.publishing.service.gov.uk/media/627cc6d3d3bf7f052d33b06e/home-office-indicators-of-integration-framework-2019-horr109.pdf
3. EMN Glossary — Common Basic Principles (2004/2014). https://home-affairs.ec.europa.eu/networks/european-migration-network-emn/emn-asylum-and-migration-glossary/glossary/common-basic-principles_en · EU integration policy: https://home-affairs.ec.europa.eu/policies/migration-and-asylum/migrant-integration/eu-integration-policy_en
4. Zaragoza Declaration indicators (2010). https://home-affairs.ec.europa.eu/pages/glossary/zaragoza-declaration-integration_en · Eurostat background: https://ec.europa.eu/eurostat/documents/12544011/12985358/Zaragoza_delcaration_indicators.pdf
5. OECD/European Commission (2023). *Indicators of Immigrant Integration 2023: Settling In*. https://migrant-integration.ec.europa.eu/library-document/settling-report-indicators-immigrant-integration-2023_en
6. MIPEX 2025 — France. https://www.mipex.eu/france · Key findings: https://www.mipex.eu/key-findings-2025 · Results PDF: https://migpolgroup.com/wp-content/uploads/2025/09/MIPEX-results-2025.pdf
7. EU Action Plan on Integration and Inclusion 2021–2027. https://home-affairs.ec.europa.eu/policies/migration-and-asylum/migrant-integration/migrant-integration-hub/progress-tracker-action-plan-integration-and-inclusion-2021-2027_en · ECRE summary: https://ecre.org/the-european-commission-releases-its-new-action-plan-for-integration-and-inclusion-2021-2027/
8. UNHCR — Local integration. https://www.unhcr.org/us/what-we-do/build-better-futures/long-term-solutions/local-integration · ExCom Conclusion on Local Integration: https://www.unhcr.org/us/publications/conclusion-local-integration
9. IOM — Key Migration Terms (Glossary on Migration). https://www.iom.int/key-migration-terms
10. Berry, J.W. (1997) acculturation strategies — summary: https://open.maricopa.edu/culturepsychology/chapter/berrys-model-of-acculturation/
11. UNHCR/Accenture (2016). *Connecting Refugees*. https://www.unhcr.org/innovation/wp-content/uploads/2018/02/20160707-Connecting-Refugees-Web_with-signature.pdf
12. Gillespie, M. et al. (2016). *Mapping Refugee Media Journeys: Smartphones and Social Media Networks*. Open University / France Médias Monde. https://www.open.ac.uk/ccig/research/projects/mapping-refugee-media-journeys · PDF: https://www.statewatch.org/media/documents/news/2016/may/ou-mapping-refugee-media-journeys.pdf
13. Wall, M., Otis Campbell, M., Janbek, D. (2017). Syrian refugees and information precarity. *New Media & Society* 19(2). https://journals.sagepub.com/doi/abs/10.1177/1461444815591967
14. Lloyd, A. et al. (2013). Connecting with new information landscapes: information literacy practices of refugees. *Journal of Documentation* 69(1). https://www.emerald.com/insight/content/doi/10.1108/00220411311295351/full/html
15. Dekker, R., Engbersen, G., Klaver, J., Vonk, H. (2018). Smart Refugees. *Social Media + Society* 4(1). https://journals.sagepub.com/doi/10.1177/2056305118764439
16. Réfugiés.info (DIAIR) — OECD blog: https://www.oecd.org/en/blogs/2020/11/-refugiesinfo.html · Platform: https://refugies.info/en · Labo Société Numérique: https://labo.societenumerique.gouv.fr/en/articles/refugeesinfo-a-public-digital-platform-for-helping-refugees/
17. Soliguide (Solinum). https://soliguide.fr/en · https://solinum.org/tout · 17b. Watizat: https://watizat.org/en/ · 17c. IRC Signpost: https://www.rescue.org/article/impact-signpost-bridging-information-gap-people-crisis · https://www.rescue.org/press-release/signpost-digital-initiative-reaches-1-million-people-across-three-continents
18. Mixed Migration Centre. Hype or hope? Evidence on use of smartphones & social media in mixed migration. https://mixedmigration.org/articles/hype-or-hope-new-evidence-on-the-use-of-smartphones-and-social-media-in-mixed-migration/
19. Emmer, M., Kunst, M., Richter, C. (2020). Information seeking and communication during forced migration. *Global Media and Communication*. https://journals.sagepub.com/doi/10.1177/1742766520921905
20. MPI (2023). Technology Can Be Transformative for Refugees, but It Can Also Hold Them Back. https://www.migrationpolicy.org/article/digital-technology-refugees · IJOC 19 (2025), Digital Literacy, Information Precarity…: https://ijoc.org/index.php/ijoc/article/download/24025/5035/0
21. What the Telegram Channels of Ukrainian Migrants in Germany 'Talk' and 'Keep Silent' About (De Gruyter). https://www.degruyterbrill.com/document/doi/10.1515/9783839475874-017/html · Analyzing the Needs of Ukrainian Refugees on Telegram in Real-Time (ML): https://www.researchgate.net/publication/374548280 · DFRLab (2022) Polish-language Telegram anti-refugee narratives: https://dfrlab.org/2022/05/31/polish-language-telegram-channels-spread-anti-refugee-narratives/
22. Migration Policy Group (2023). Promoting Digital Inclusion of Migrants and Refugees in the EU — policy brief. https://www.migpolgroup.com/wp-content/uploads/2023/05/EU-Policy-Brief-MPG.pdf
23. AIDA/ECRE — France: Access to the labour market. https://asylumineurope.org/reports/country/france/reception-conditions/employment-and-education/access-labour-market/ · GISTI: https://www.gisti.org/spip.php?article5235=
24. Service-public — Rights of asylum seekers (ADA, housing, health). https://www.service-public.gouv.fr/particuliers/vosdroits/F32454?lang=en
25. DGEF — L'accès aux soins pour demandeurs d'asile. https://www.immigration.interieur.gouv.fr/politique-de-lasile/lacces-aux-soins-pour-demandeurs-dasile · ameli: https://www.ameli.fr/assure/droits-demarches/europe-international/protection-sociale-france/demandeur-d-asile
26. AIDA — France: Safe country of origin (Georgia listed; top-10 in 2025). https://asylumineurope.org/reports/country/france/asylum-procedure/the-safe-country-concepts/safe-country-origin/ · ECRE (2013): https://ecre.org/albania-georgia-and-kosovo-added-to-the-french-list-of-safe-countries-of-origin/
27. USCIS — Asylum / 180-day EAD clock. https://www.uscis.gov/humanitarian/refugees-and-asylum/asylum · 8 CFR 208.7: https://www.ecfr.gov/current/title-8/chapter-I/subchapter-B/part-208/subpart-A/section-208.7
28. NILC — Overview of Immigrant Eligibility for Federal Programs; Can undocumented immigrants access health care? https://www.nilc.org/resources/overview-immeligfedprograms/ · https://www.nilc.org/articles/can-undocumented-immigrants-access-health-care/ · KFF: https://www.kff.org/racial-equity-and-health-policy/5-key-facts-about-immigrants-and-medicaid/
29. Contrat d'intégration républicaine (CIR) — Ministère de l'Intérieur. https://etrangers-en-france.interieur.gouv.fr/vivre-en-france/le-contrat-d-integration-republicaine · Parlera OFII-CIR 2024-25: https://parlera.fr/wp/wp-content/uploads/2025/03/FR-Parlera_24-25_OFII-CIR-en-transition.pdf
30. ENIC-NARIC France — assessment procedures (free for refugees/asylum seekers). https://www.france-education-international.fr/article/les-procedures-devaluation-des-diplomes-au-centre-enic-naric-france?langue=en · DIAIR: https://accueil-integration-refugies.fr/education/
31. AME — ameli.fr. https://www.ameli.fr/assure/droits-demarches/situations-particulieres/situation-irreguliere-ame · Musée de l'histoire de l'immigration: https://www.histoire-immigration.fr/politique-et-immigration/qu-est-ce-que-l-aide-medicale-de-l-etat
32. Spain — Real Decreto 1155/2024, arraigo 2 years (in force 2025-05-20). https://www.visahq.com/news/2025-11-19/es/spain-shortens-arraigo-social-regularization-period-to-2-years/ · https://www.costaluzlawyers.com/major-immigration-reform-in-spain-what-changes-in-may-2025/
33. Eurostat — 4.43 million under temporary protection in July 2026. https://ec.europa.eu/eurostat/en/web/products-eurostat-news/w/ddn-20260910-1 · Council extension to March 2028: https://www.consilium.europa.eu/en/press/press-releases/2026/07/15/eu-countries-agree-to-extend-temporary-protection-for-those-fleeing-ukraine-until-march-2028/
34. EUAA Asylum Report 2024/2025 — Temporary protection boxes (SAM-UKR). https://www.euaa.europa.eu/asylum-report-2024/box-2-temporary-protection-displaced-persons-ukraine · https://www.euaa.europa.eu/asylum-report-2025/box-6-temporary-protection-displaced-persons-ukraine
35. WHO (2022). *World report on the health of refugees and migrants*. https://www.who.int/news-room/fact-sheets/detail/refugee-and-migrant-health · Mental health of refugees and migrants (2023): https://www.who.int/publications/i/item/9789240081840
36. France24 (2019). Les Géorgiens, premiers bénéficiaires de l'aide médicale aux demandeurs d'asile. https://www.france24.com/fr/20191010-focus-georgiens-france-immigration-demande-asile-abus-aide-medicale-etat-soins-sante-visas · Sciences Po École de droit, Rapport Géorgie 2022: https://www.sciencespo.fr/ecole-droit/fr/actualites/problematiques-de-sante-des-ressortissants-georgiens-et-droit-au-sejour/
37. La Cimade — Rapport d'activité OFPRA 2022 (Géorgie: 8,099 premières demandes). https://www.lacimade.org/rapport-dactivite-ofpra-cartographie-de-la-demande-dasile-en-2022/ · OFPRA 2024: https://www.ofpra.gouv.fr/actualites/rapport-dactivite-2024
38. ICDS (2024) New Russian Immigration to the EU: https://icds.ee/wp-content/uploads/dlm_uploads/2024/10/ICDS_Report_New_Russian_Immigration_to_the_EU_Igor_Gretskiy_October_2024.pdf · CASE: https://case-center.org/parts/russian-diasporas-in-eu-member-states-similarity-and-differences/ · Meduza/OutRush 2025: https://meduza.io/en/feature/2025/03/26/less-sadness-more-frustration
39. Georgians in France (≈14,500, 2017). https://en.wikipedia.org/wiki/Georgians_in_France · The Local (2019): https://www.thelocal.fr/20191008/the-numbers-that-tell-the-story-of-immigration-in-france/
40. ICMPD ENIGMMA 2 — Georgian diaspora in Greece, Italy and Spain: https://www.icmpd.org/file/download/48444/file/ENIGMMA020Case0Study_0Georgian0Diaspora0in0GreeceC0Italy0and0Spain0EN.pdf · OECD, A Review of Georgian Emigrants: https://www.oecd.org/en/publications/a-review-of-georgian-emigrants_00df3f32-en.html · Georgian diaspora: https://en.wikipedia.org/wiki/Georgian_diaspora

---
*პროექტის შიდა წყაროები (წაკითხული):* `CLAUDE.md`, `.grantkit-redesign/ORG-CENTRIC-MEMORY.md`, `PLAN-france-orgs-import.md`, `HANDOFF-claude-code-wave1.md`, `PROJECT_MAP.md`, `drizzle/schema.ts` (organizations, organization_housing), `client/src/lib/constants.ts`, `client/src/i18n/en.ts`, `shared/profileTypes.ts`.
