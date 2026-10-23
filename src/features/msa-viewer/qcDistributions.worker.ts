import { calculateQcDistributions } from "./qcDistributions";
self.onmessage = event => {
  try { self.postMessage({ result: calculateQcDistributions(event.data) }); }
  catch { self.postMessage({ error: true }); }
};
export {};
