import {expect,it} from "vitest";
import {isBenchmarkFailure,isMetricFailure} from "./metrics";
import {availableMetric,absentMetric} from "./__tests__/fixtures";
it.each(["timeout","oom","invalid_output","execution_failed","scoring_failed","platform_error","reference_invalid"])("marks %s as an error",reason=>{
  expect(isBenchmarkFailure(undefined,[reason])).toBe(true);
  expect(isMetricFailure(absentMetric(reason as Parameters<typeof absentMetric>[0],1))).toBe(true);
});
it.each(["no_reference","not_run","unsupported","cancelled","incomplete"])("keeps %s neutral",reason=>{
  expect(isBenchmarkFailure(undefined,[reason])).toBe(false);
});
it("keeps available values green and no-reference metrics neutral even on a failed row",()=>{
  expect(isMetricFailure(availableMetric(0,1,1),"failed","oom")).toBe(false);
  expect(isMetricFailure(absentMetric("no_reference",1),"timeout","timeout")).toBe(false);
  expect(isMetricFailure(undefined,"timeout")).toBe(true);
  expect(isMetricFailure(undefined,"failed")).toBe(true);
});
