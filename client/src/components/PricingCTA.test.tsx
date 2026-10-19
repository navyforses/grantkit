// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { en } from "@/i18n/en";
vi.mock("@/contexts/LanguageContext", () => ({ useLanguage: () => ({ t: en }) }));
import PricingCTA from "./PricingCTA";

afterEach(cleanup);
describe("Free directory entry", () => {
  it("replaces a legacy payment prompt with an anonymous directory link", () => {
    const open = vi.fn();
    window.Paddle = { Initialize: vi.fn(), Checkout: { open } };
    render(<PricingCTA text="Subscribe to unlock" />);
    const link = screen.getByRole("link", { name: en.hero.cta });
    expect(link.getAttribute("href")).toBe("/organizations?mc=FR");
    expect(screen.queryByText("Subscribe to unlock")).toBeNull();
    fireEvent.click(link);
    expect(open).not.toHaveBeenCalled();
    delete window.Paddle;
  });
});
