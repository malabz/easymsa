import "@testing-library/jest-dom/vitest";
import {cleanup,fireEvent,render,screen,within} from "@testing-library/react";
import {afterEach,expect,it} from "vitest";
import {MemoryRouter} from "react-router-dom";
import published from "../../../public/benchmark/snapshot.json";
import {parseSnapshot} from "./model";
import {BenchmarkIntroduction} from "./BenchmarkIntroduction";

afterEach(cleanup);
it.each(["en","zh"] as const)("provides a version and accessible source for every published method (%s)",locale=>{
  const snapshot=parseSnapshot(published);
  render(<MemoryRouter><BenchmarkIntroduction snapshot={snapshot} locale={locale}/></MemoryRouter>);
  fireEvent.click(screen.getByText(locale==="zh"?"第一次使用？了解数据、方法和成绩":"First time? Datasets, methods and scores"));
  const entries=within(screen.getByRole("list")).getAllByRole("listitem");
  expect(entries).toHaveLength(snapshot.methods.length);
  for(const method of snapshot.methods){
    const entry=entries.find(item=>within(item).queryByText(method.name,{selector:"strong"}));
    expect(entry).toBeDefined();
    const link=within(entry!).getByRole("link",{name:locale==="zh"?"来源":"Source"});
    expect(new URL(link.getAttribute("href")!).protocol).toBe("https:");
    const versions=snapshot.batches.flatMap(batch=>batch.methods.filter(spec=>spec.method_id===method.id).map(spec=>spec.version));
    expect(versions.length).toBeGreaterThan(0);
    for(const version of versions)expect(entry).toHaveTextContent(version);
  }
});
