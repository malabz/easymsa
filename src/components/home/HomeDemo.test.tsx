import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { HomeDemo, formatDemoTime } from "./HomeDemo";

let intersection: IntersectionObserverCallback;
let desktop = true;
let reduced = false;
let hidden = false;
const preferenceListeners = new Set<() => void>();
const play = vi.fn();
const pause = vi.fn();
const load = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  desktop = true; reduced = false; hidden = false; preferenceListeners.clear();
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
  Object.defineProperty(HTMLMediaElement.prototype, "readyState", { configurable: true, get: () => 4 });
  Object.defineProperty(HTMLMediaElement.prototype, "duration", { configurable: true, get: () => 40 });
  play.mockImplementation(function (this: HTMLMediaElement) { fireEvent.play(this); return Promise.resolve(); });
  pause.mockImplementation(function (this: HTMLMediaElement) { fireEvent.pause(this); });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(play);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(pause);
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(load);
  vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
    get matches() { return query.includes("reduced-motion") ? reduced : desktop; },
    addEventListener: (_: string, listener: () => void) => preferenceListeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => preferenceListeners.delete(listener),
  })));
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: IntersectionObserverCallback) { intersection = callback; }
    observe() {} disconnect() {} unobserve() {}
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function show(locale: "en" | "zh" = "en") { return render(<MemoryRouter><HomeDemo locale={locale} /></MemoryRouter>); }
function visibility(isVisible: boolean) {
  act(() => intersection([{ isIntersecting: isVisible, intersectionRatio: isVisible ? 1 : 0 } as IntersectionObserverEntry], {} as IntersectionObserver));
}

describe("home demo playback", () => {
  it("keeps sources unloaded until the desktop video becomes visible", () => {
    const { container } = show();
    expect(container.querySelector("source")).toBeNull();
    expect(container.querySelector("video")).toHaveAttribute("preload", "none");
    expect(container.querySelector("video")).toHaveAttribute("aria-hidden", "true");
    visibility(true);
    expect(container.querySelectorAll("source")).toHaveLength(2);
    expect(play).toHaveBeenCalled();
    expect(load).toHaveBeenCalled();
  });
  it.each(["mobile", "reduced"])("autoplays the muted demo on %s when visible", (mode) => {
    if (mode === "mobile") desktop = false; else reduced = true;
    const { container } = show(); visibility(true);
    expect(container.querySelectorAll("source")).toHaveLength(2);
    expect(play).toHaveBeenCalled();
    expect(container.querySelector("video")).toHaveAttribute("playsinline");
  });
  it("pauses offscreen and resumes when visible", () => {
    show(); visibility(true); play.mockClear(); pause.mockClear(); visibility(false);
    expect(pause).toHaveBeenCalled(); visibility(true); expect(play).toHaveBeenCalled();
  });
  it("does not resume a user-paused video", () => {
    show(); visibility(true);
    fireEvent.click(screen.getByRole("button", { name: "Pause demo" }));
    play.mockClear(); visibility(false); visibility(true); expect(play).not.toHaveBeenCalled();
  });
  it("pauses on background tabs and resumes without overriding user intent", () => {
    show(); visibility(true); pause.mockClear();
    hidden = true; fireEvent(document, new Event("visibilitychange")); expect(pause).toHaveBeenCalled();
    play.mockClear(); hidden = false; fireEvent(document, new Event("visibilitychange")); expect(play).toHaveBeenCalled();
  });
  it("keeps the explicit pause control available with reduced motion", () => {
    reduced = true; show(); visibility(true); pause.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Pause demo" }));
    expect(pause).toHaveBeenCalled();
  });
  it("supports chapter navigation and accessible seeking", () => {
    const { container } = show(); visibility(true);
    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    expect(container.querySelector("video")!.currentTime).toBe(32);
    expect(screen.getByRole("button", { name: "Download" })).toHaveAttribute("aria-current", "step");
    fireEvent.change(screen.getByRole("slider", { name: "Demo progress" }), { target: { value: "18.5" } });
    expect(container.querySelector("video")!.currentTime).toBe(18.5);
  });
  it("preserves a chapter request while metadata is loading", () => {
    Object.defineProperty(HTMLMediaElement.prototype, "readyState", { configurable: true, get: () => 0 });
    const { container } = show(); visibility(true);
    fireEvent.click(screen.getByRole("button", { name: "Explore" }));
    const element = container.querySelector("video")!;
    fireEvent.loadedMetadata(element); expect(element.currentTime).toBe(15);
  });
  it("falls back to the poster and example link on media failure", () => {
    const { container } = show(); visibility(true); fireEvent.error(container.querySelector("video")!);
    expect(screen.getByRole("status")).toHaveTextContent("The demo is unavailable");
    expect(screen.getByRole("link", { name: "Open full example" })).toHaveAttribute("href", "/examples/alignment-small");
    expect(screen.getByRole("slider")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Reload demo" }));
    expect(screen.queryByText(/The demo is unavailable/)).not.toBeInTheDocument();
  });
  it("waits for both source failures before showing the fallback", () => {
    const { container } = show(); visibility(true);
    const sources = container.querySelectorAll("source"); fireEvent.error(sources[0]);
    expect(screen.queryByText(/The demo is unavailable/)).not.toBeInTheDocument();
    fireEvent.error(sources[1]); expect(screen.getByText(/The demo is unavailable/)).toBeVisible();
  });
  it("offers manual playback when autoplay is rejected", async () => {
    play.mockRejectedValueOnce(new DOMException("Blocked", "NotAllowedError"));
    show(); await act(async () => visibility(true));
    expect(screen.getAllByRole("button", { name: "Play demo" }).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("button", { name: "Play demo" })[0]); expect(play).toHaveBeenCalledTimes(2);
  });
  it("uses locale-specific media and labels", () => {
    const { container } = show("zh"); visibility(true);
    expect(container.querySelector("video")!.poster).toContain("/media/home/v2/poster-zh.webp");
    expect(container.querySelector("source")!.src).toContain("demo-zh.mp4");
    expect(screen.getByRole("button", { name: "下载" })).toBeVisible();
  });
  it("requests fullscreen on the player", () => {
    show(); const player = screen.getByRole("region"); const request = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(player, "requestFullscreen", { value: request });
    fireEvent.click(screen.getByRole("button", { name: "View fullscreen" })); expect(request).toHaveBeenCalled();
  });
  it("reports fullscreen unavailability without breaking playback", async () => {
    show(); fireEvent.click(screen.getByRole("button", { name: "View fullscreen" }));
    expect(await screen.findByText("Fullscreen playback is unavailable in this browser.")).toBeVisible();
  });
  it.each([[0, "0:00"], [9.8, "0:09"], [65, "1:05"], [-4, "0:00"], [NaN, "0:00"]])("formats %s as %s", (input, expected) => expect(formatDemoTime(input as number)).toBe(expected));
});
