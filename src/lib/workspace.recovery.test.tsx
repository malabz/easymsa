import { act, cleanup, render, renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { forgetJobWork, forgetWork, restoreJobWork, useRememberWork, useWorkEntries, type WorkEntry } from "./workspace";

const kinds: WorkEntry["kind"][] = ["submit", "realign", "viewer", "job", "result", "example"];
function Remember({ kind }: { kind: WorkEntry["kind"] }) { useRememberWork(kind); return null; }
function remember(kind: WorkEntry["kind"], path: string) {
  const view = render(<MemoryRouter initialEntries={[path]}><Remember kind={kind} /></MemoryRouter>);
  view.unmount();
}
beforeEach(() => { kinds.forEach(forgetWork); });
afterEach(cleanup);

describe("recovery removal and undo preserve active work", () => {
  it("removes exactly the job/key pair and restores it without affecting drafts or viewer", () => {
    remember("submit", "/submit");
    remember("viewer", "/viewer");
    remember("job", "/job/%E6%B5%8B%E8%AF%95?token=selected");
    remember("result", "/results/%E6%B5%8B%E8%AF%95?token=another&stage=initial");
    const { result } = renderHook(useWorkEntries);
    const before = result.current;
    let removed: WorkEntry[] = [];
    act(() => { removed = forgetJobWork("测试", "selected"); });
    expect(removed).toEqual([{ kind: "job", path: "/job/%E6%B5%8B%E8%AF%95?token=selected" }]);
    expect(result.current).toEqual(before.filter(entry => entry.kind !== "job"));
    act(() => { restoreJobWork(removed); });
    expect(result.current).toHaveLength(4);
    expect(result.current).toEqual(expect.arrayContaining(before));
  });

  it("undo does not replace newer work of the same kind or create duplicate entries", () => {
    remember("result", "/results/old?token=old-key&stage=refined");
    const removed = forgetJobWork("old", "old-key");
    remember("result", "/results/new?token=new-key&stage=initial");
    remember("realign", "/realign");
    const { result } = renderHook(useWorkEntries);
    const before = result.current;
    act(() => { restoreJobWork(removed); restoreJobWork(removed); });
    expect(result.current).toEqual(before);
    expect(result.current.find(entry => entry.kind === "result")?.path).toContain("/results/new");
  });
});
