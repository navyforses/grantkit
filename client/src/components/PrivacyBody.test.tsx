import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { en } from "@/i18n/en";
import { fr } from "@/i18n/fr";
import { es } from "@/i18n/es";
import { ru } from "@/i18n/ru";
import { ka } from "@/i18n/ka";
import PrivacyBody from "./PrivacyBody";

const dictionaries = { en, fr, es, ru, ka };

// React escapes these in static markup; mirror it so text assertions match.
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

function render(t: typeof en): string {
  return renderToStaticMarkup(
    createElement(Router, { ssrPath: "/privacy", children: createElement(PrivacyBody, { t }) }),
  );
}

describe("PrivacyBody (Phase 1.9 done-when)", () => {
  for (const [lang, t] of Object.entries(dictionaries)) {
    it(`renders in ${lang} with the /trust link and no analytics-cookie claim`, () => {
      const html = render(t);
      expect(html).toContain('href="/trust"');
      expect(html).toContain(esc(t.legal.privacyMoneyLink));
      expect(html).toContain(esc(t.legal.privacyCollectStatus));
      expect(html.toLowerCase()).not.toContain("analytics cookie");
      expect(html).toContain("hello@grantkit.co");
    });
  }
});
