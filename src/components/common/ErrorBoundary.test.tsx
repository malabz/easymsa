import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const labels = { title: "Page failed", description: "Try another dataset", retryLabel: "Retry" };
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(value => value + 1)}>Selected {count}</button>;
}
it("preserves the workspace when its reset key changes without a render error", () => {
  const content = (resetKey: string) => <ErrorBoundary {...labels} resetKey={resetKey}><Counter /></ErrorBoundary>;
  const view = render(content("dataset-a"));
  fireEvent.click(screen.getByRole("button", { name: "Selected 0" }));
  view.rerender(content("dataset-b"));
  expect(screen.getByRole("button", { name: "Selected 1" })).toBeInTheDocument();
});
it("recovers a failed workspace when navigation changes its reset key", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  function Record({ fail }: { fail: boolean }) {
    if (fail) throw new Error("broken dataset");
    return <h1>Valid dataset</h1>;
  }
  const content = (key: string, fail: boolean) => <ErrorBoundary {...labels} resetKey={key}><Record fail={fail} /></ErrorBoundary>;
  const view = render(content("dataset-a", true));
  expect(screen.getByRole("alert")).toHaveTextContent("Page failed");
  view.rerender(content("dataset-b", false));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Valid dataset" })).toBeInTheDocument();
});
