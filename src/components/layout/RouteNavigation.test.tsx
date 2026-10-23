import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Link, MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { focusMainContent, RouteNavigation } from "./RouteNavigation";

const setScroll = (top: number) => Object.defineProperty(window, "scrollY", { value: top, writable: true, configurable: true });
let scroll: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  setScroll(0);
  scroll = vi.spyOn(window, "scrollTo").mockImplementation(((options: ScrollToOptions) => setScroll(options.top ?? 0)) as typeof window.scrollTo);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); setScroll(0); });

function Harness() {
  const navigate = useNavigate();
  return <><RouteNavigation /><nav><Link to="/about">About</Link><Link to="/docs?section=inputs">Topic</Link><Link to="/docs?tab=other">Query</Link><button onClick={() => navigate(-1)}>Back</button></nav>
    <main id="main-content" tabIndex={-1}><Routes><Route path="/docs" element={<h1>Docs</h1>} /><Route path="/about" element={<h1>About title</h1>} /></Routes></main></>;
}
it("resets a new page and focuses its main content", () => {
  render(<MemoryRouter initialEntries={["/docs"]}><Harness /></MemoryRouter>);
  setScroll(600); fireEvent.scroll(window);
  fireEvent.click(screen.getByRole("link", { name: "About" }));
  expect(scroll).toHaveBeenLastCalledWith({ top: 0, behavior: "instant" });
  expect(document.getElementById("main-content")).toHaveFocus();
  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  expect(scroll).toHaveBeenLastCalledWith({ top: 600, behavior: "instant" });
});
it("does not reset document scroll for query-only changes", () => {
  render(<MemoryRouter initialEntries={["/docs"]}><Harness /></MemoryRouter>);
  setScroll(250); fireEvent.scroll(window); scroll.mockClear();
  fireEvent.click(screen.getByRole("link", { name: "Query" }));
  expect(scroll).not.toHaveBeenCalled();
});
it("delegates explicit documentation anchors to the documentation page", () => {
  render(<MemoryRouter initialEntries={["/about"]}><Harness /></MemoryRouter>);
  scroll.mockClear(); fireEvent.click(screen.getByRole("link", { name: "Topic" }));
  expect(scroll).not.toHaveBeenCalled();
});
it("skip action focuses main without changing the hash route", () => {
  render(<main id="main-content" tabIndex={-1}>Current page</main>);
  const previous = window.location.hash;
  focusMainContent();
  expect(document.getElementById("main-content")).toHaveFocus();
  expect(window.location.hash).toBe(previous);
});
