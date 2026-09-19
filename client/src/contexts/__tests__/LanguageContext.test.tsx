// @vitest-environment jsdom
/*
 * Phase 1.7 — navigator.language autodetect on first visit only.
 */
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { LanguageProvider, detectBrowserLanguage, useLanguage } from "@/contexts/LanguageContext";

afterEach(cleanup);
beforeEach(() => localStorage.clear());

function setNavigatorLanguage(value: string) {
  Object.defineProperty(window.navigator, "language", { value, configurable: true });
}

function Probe() {
  const { language } = useLanguage();
  return <span data-testid="lang">{language}</span>;
}

describe("detectBrowserLanguage", () => {
  it("maps supported prefixes and falls back to en", () => {
    expect(detectBrowserLanguage("ka-GE")).toBe("ka");
    expect(detectBrowserLanguage("ru")).toBe("ru");
    expect(detectBrowserLanguage("fr-FR")).toBe("fr");
    expect(detectBrowserLanguage("es-419")).toBe("es");
    expect(detectBrowserLanguage("en-US")).toBe("en");
    expect(detectBrowserLanguage("de-DE")).toBe("en");
    expect(detectBrowserLanguage(undefined)).toBe("en");
  });
});

describe("LanguageProvider first-visit autodetect", () => {
  it("uses the browser language when nothing is stored", () => {
    setNavigatorLanguage("ka-GE");
    render(<LanguageProvider><Probe /></LanguageProvider>);
    expect(screen.getByTestId("lang").textContent).toBe("ka");
  });
  it("stored preference wins over the browser language", () => {
    localStorage.setItem("grantkit-lang", "fr");
    setNavigatorLanguage("ka-GE");
    render(<LanguageProvider><Probe /></LanguageProvider>);
    expect(screen.getByTestId("lang").textContent).toBe("fr");
  });
  it("unsupported browser language → en", () => {
    setNavigatorLanguage("de-DE");
    render(<LanguageProvider><Probe /></LanguageProvider>);
    expect(screen.getByTestId("lang").textContent).toBe("en");
  });
});

describe("tCountry", () => {
  function CountryProbe() {
    const { tCountry } = useLanguage();
    return <span data-testid="c">{tCountry("FR")}|{tCountry("US")}|{tCountry("ZZ")}</span>;
  }
  it("translates ISO codes via t.country and falls back to the raw code", () => {
    localStorage.setItem("grantkit-lang", "ka");
    render(<LanguageProvider><CountryProbe /></LanguageProvider>);
    const [fr, us, zz] = screen.getByTestId("c").textContent!.split("|");
    expect(fr).not.toBe("FR");
    expect(us).toBe("აშშ");
    expect(zz).toBe("ZZ");
  });
});
