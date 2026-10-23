import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import { LanguageProvider } from "../../lib/i18n/LanguageProvider";
import { ExampleInputLoader } from "./ExampleInputLoader";

const mocks = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("../../lib/examples", () => ({ loadExampleInput: mocks.load }));
beforeEach(() => { vi.clearAllMocks(); localStorage.setItem("easymsa.locale", "en"); mocks.load.mockResolvedValue({ file: new File([">a\nAC\n>b\nAC"], "example.fa") }); });
afterEach(cleanup);
function Location() { const location = useLocation(); return <output data-testid="location">{location.search}</output>; }
function show(hasInput = true, onLoad = vi.fn()) {
  render(<MemoryRouter initialEntries={["/submit?example=alignment-small"]}><LanguageProvider>
    <ExampleInputLoader kind="alignment" disabled={false} hasInput={hasInput} onLoad={onLoad} /><Location />
  </LanguageProvider></MemoryRouter>);
  return onLoad;
}
it("requires explicit replacement for an example URL when a draft exists", async () => {
  const apply = show(); const user = userEvent.setup();
  expect(screen.getByRole("button", { name: "Replace input" })).toBeVisible();
  expect(mocks.load).not.toHaveBeenCalled(); expect(apply).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.getByTestId("location")).toHaveTextContent("");
  expect(apply).not.toHaveBeenCalled();
});
it("applies the example once after confirmation and removes the URL request", async () => {
  const apply = show(); const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Replace input" }));
  await waitFor(() => expect(apply).toHaveBeenCalledTimes(1));
  expect(mocks.load).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId("location")).not.toHaveTextContent("example=");
});
it("loads automatically only into a fresh form", async () => {
  const apply = show(false);
  await waitFor(() => expect(apply).toHaveBeenCalledTimes(1));
  expect(screen.queryByRole("button", { name: "Replace input" })).not.toBeInTheDocument();
});
