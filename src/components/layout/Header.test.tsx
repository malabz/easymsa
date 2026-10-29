import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "../../lib/i18n/LanguageProvider";
import { Header } from "./Header";

beforeEach(() => { localStorage.setItem("easymsa.locale", "en"); });
afterEach(cleanup);
it("keeps Benchmark out of the desktop and mobile primary navigation", () => {
  render(<MemoryRouter><LanguageProvider><Header /></LanguageProvider></MemoryRouter>);
  expect(screen.queryByRole("link", { name: /benchmark/i })).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", "/about");
  fireEvent.click(document.getElementById("primary-navigation-toggle")!);
  expect(document.getElementById("mobile-primary-navigation")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /benchmark/i })).not.toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: "About" })).toHaveLength(2);
});
it("uses the same navigation container on reading and task pages", () => {
  const first = render(<MemoryRouter initialEntries={["/docs"]}><LanguageProvider><Header /></LanguageProvider></MemoryRouter>);
  const readingClass = first.container.querySelector(".app-header-inner")?.className;
  first.unmount();
  const second = render(<MemoryRouter initialEntries={["/submit"]}><LanguageProvider><Header /></LanguageProvider></MemoryRouter>);
  expect(second.container.querySelector(".app-header-inner")?.className).toBe(readingClass);
  expect(second.container.querySelector(".workspace-navigation")).toBeNull();
});
it("closes the mobile menu with Escape and returns focus to its toggle", () => {
  render(<MemoryRouter><LanguageProvider><Header /></LanguageProvider></MemoryRouter>);
  const toggle = document.getElementById("primary-navigation-toggle")!;
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute("aria-expanded", "true");
  expect(document.getElementById("mobile-primary-navigation")).toBeInTheDocument();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(document.getElementById("mobile-primary-navigation")).not.toBeInTheDocument();
  expect(toggle).toHaveFocus();
  expect(screen.getAllByText("EN").length).toBeGreaterThan(0);
});
