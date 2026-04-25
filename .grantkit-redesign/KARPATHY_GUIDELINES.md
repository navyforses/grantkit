# Karpathy Guidelines — საწყისი ქცევის ფილტრი ყველა AI-სთვის

> **🛑 ეს არის #0 ფილტრი.** ნებისმიერი AI (Claude Code, Cowork, სხვა agent),
> რომელიც ამ პროექტზე მუშაობს, **პირველ რიგში** ამ ფაილს კითხულობს — სანამ
> PROJECT_MAP.md-საც კი გახსნის. ეს არის ქცევის სტანდარტი, რომელიც
> კონკრეტულ codebase-ს არ ეხება, მაგრამ განსაზღვრავს **როგორ** უნდა
> იაზროვნო და იმუშაო ნებისმიერ ცვლილებაზე.
>
> წყარო: [forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills)
> შთაგონება: [Andrej Karpathy-ის დაკვირვებები LLM-ის coding-ის შეცდომებზე](https://x.com/karpathy/status/2015883857489522876)
>
> **License:** MIT (გადმოტანილია იმავე ლიცენზიით)

---

## ცენტრალური წესი

ეს guidelines ფრთხილობას ანიჭებს უპირატესობას სიჩქარესთან შედარებით.
ტრივიალური დავალებებისთვის გამოიყენე საღი აზრი — დანარჩენ ყველა
შემთხვევაში ოთხივე პრინციპი სავალდებულოა.

---

## 1. იფიქრე სანამ კოდს დაწერ (Think Before Coding)

**ნუ ივარაუდებ. ნუ მალავ დაბნეულობას. გამოიტანე trade-off-ები ზედაპირზე.**

იმპლემენტაციამდე:

- **ცალსახად დაასახელე ვარაუდები.** თუ რამე გაურკვეველია — შეკითხე.
- **თუ რამდენიმე ინტერპრეტაცია არსებობს** — წარმოადგინე ისინი, ნუ
  აირჩევ მხოლოდ შენ თვითონ ჩუმად.
- **თუ უფრო მარტივი მიდგომა არსებობს** — თქვი. დაუპირისპირდი როცა
  გამართლებულია.
- **თუ რამე გაუგებარია — შეჩერდი.** დაასახელე ის, რაც გაგერკვევლია. შეკითხე.

---

## 2. სიმარტივე უპირველეს ყოვლისა (Simplicity First)

**მინიმალური კოდი, რომელიც ხსნის პრობლემას. არაფერი სპეკულატიური.**

- **არანაირი feature** იმაზე მეტი, რაც მოითხოვეს.
- **არანაირი აბსტრაქცია** ერთჯერადი კოდისთვის.
- **არანაირი „flexibility" / „configurability"**, რომელიც არ მოითხოვეს.
- **არანაირი error handling** შეუძლებელი სცენარებისთვის.
- **თუ დაწერე 200 ხაზი და შესაძლებელი იყო 50** — გადაწერე.

ჰკითხე საკუთარ თავს: „senior engineer იტყოდა ეს overcomplicated-ია?" თუ
კი — გაამარტივე.

---

## 3. ქირურგიული ცვლილებები (Surgical Changes)

**შეეხე მხოლოდ იმას, რასაც აუცილებლად სჭირდება. დაალაგე მხოლოდ შენი
უწესრიგობა.**

არსებული კოდის რედაქტირებისას:

- **ნუ „გააუმჯობესებ" მიმდებარე კოდს**, კომენტარებს ან ფორმატირებას.
- **ნუ refactor-ი** იმას, რაც გატეხილი არ არის.
- **დაიცავი არსებული style** — მაშინაც კი, თუ შენ სხვანაირად გააკეთებდი.
- **თუ შეამჩნიე უკავშირო dead code** — ახსენე, ნუ წაშლი.

როცა შენი ცვლილებები orphan-ებს ქმნის:

- **წაშალე imports / variables / functions**, რომლებიც **შენმა** ცვლილებებმა
  გამოუყენებელი გახადა.
- **ნუ წაშლი წინასწარ არსებული dead code**, თუ არ გთხოვეს.

**ტესტი:** ყოველი შეცვლილი ხაზი პირდაპირ უნდა მიდიოდეს მომხმარებლის
მოთხოვნამდე.

---

## 4. მიზანზე ორიენტირებული შესრულება (Goal-Driven Execution)

**განსაზღვრე წარმატების კრიტერიუმი. იციკლე სანამ არ გადამოწმდება.**

გადააქციე დავალებები შემოწმებად მიზნებად:

- „ვალიდაცია დაამატე" → „დაწერე ტესტები არასწორი input-ებისთვის, შემდეგ
  გაიარონ"
- „bug-ი გამოასწორე" → „დაწერე ტესტი, რომელიც bug-ს reproduce-ს, შემდეგ
  გაიაროს"
- „X refactor-ი" → „ტესტები გაიაროს refactor-მდე და შემდეგ"

მრავალ-საფეხურიანი დავალებებისთვის წარმოადგინე მოკლე გეგმა:

```
1. [საფეხური] → შემოწმება: [რას ამოწმებ]
2. [საფეხური] → შემოწმება: [რას ამოწმებ]
3. [საფეხური] → შემოწმება: [რას ამოწმებ]
```

**ძლიერი წარმატების კრიტერიუმი** საშუალებას გაძლევს დამოუკიდებლად
იციკლო. სუსტი კრიტერიუმი („ააწყვე") მუდმივ დაზუსტებას მოითხოვს.

---

## ეს guidelines მუშაობს თუ:

- **ნაკლები არასაჭირო ცვლილება** diff-ებში
- **ნაკლები გადაწერა** overcomplication-ის გამო
- **დამაზუსტებელი კითხვები იწვევა იმპლემენტაციას**, არა იმპლემენტაცია
  იწვევს კითხვებს შეცდომების გამოვლენის შემდეგ

---

## GrantKit-ის კონტექსტში

ეს ფილტრი **ემატება**, არ ცვლის — შემდეგ წესებს:

1. **CLAUDE.md** — პროექტის ძირითადი წესები (Georgian)
2. **PROJECT_MAP.md** — ცოცხალი რუკა (status, frozen files, golden rules)
3. **OPS.md** — operator-ის runbook (API keys, env vars)

**წაკითხვის რიგი ყოველი სესიის დასაწყისში:**

```
1. KARPATHY_GUIDELINES.md  ← როგორ ვიფიქრო (ეს ფაილი)
2. CLAUDE.md               ← პროექტის წესები
3. PROJECT_MAP.md          ← სად რა არის
4. OPS.md                  ← რა setup უკვე გაკეთებულია
```

---

## Original (English source)

> # Karpathy Guidelines
>
> Behavioral guidelines to reduce common LLM coding mistakes, derived from
> [Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876)
> on LLM coding pitfalls.
>
> **Tradeoff:** These guidelines bias toward caution over speed. For trivial
> tasks, use judgment.
>
> ## 1. Think Before Coding
>
> **Don't assume. Don't hide confusion. Surface tradeoffs.**
>
> Before implementing:
> - State your assumptions explicitly. If uncertain, ask.
> - If multiple interpretations exist, present them - don't pick silently.
> - If a simpler approach exists, say so. Push back when warranted.
> - If something is unclear, stop. Name what's confusing. Ask.
>
> ## 2. Simplicity First
>
> **Minimum code that solves the problem. Nothing speculative.**
>
> - No features beyond what was asked.
> - No abstractions for single-use code.
> - No "flexibility" or "configurability" that wasn't requested.
> - No error handling for impossible scenarios.
> - If you write 200 lines and it could be 50, rewrite it.
>
> Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes,
> simplify.
>
> ## 3. Surgical Changes
>
> **Touch only what you must. Clean up only your own mess.**
>
> When editing existing code:
> - Don't "improve" adjacent code, comments, or formatting.
> - Don't refactor things that aren't broken.
> - Match existing style, even if you'd do it differently.
> - If you notice unrelated dead code, mention it - don't delete it.
>
> When your changes create orphans:
> - Remove imports/variables/functions that YOUR changes made unused.
> - Don't remove pre-existing dead code unless asked.
>
> The test: Every changed line should trace directly to the user's request.
>
> ## 4. Goal-Driven Execution
>
> **Define success criteria. Loop until verified.**
>
> Transform tasks into verifiable goals:
> - "Add validation" → "Write tests for invalid inputs, then make them pass"
> - "Fix the bug" → "Write a test that reproduces it, then make it pass"
> - "Refactor X" → "Ensure tests pass before and after"
>
> For multi-step tasks, state a brief plan:
> ```
> 1. [Step] → verify: [check]
> 2. [Step] → verify: [check]
> 3. [Step] → verify: [check]
> ```
>
> Strong success criteria let you loop independently. Weak criteria ("make it
> work") require constant clarification.
