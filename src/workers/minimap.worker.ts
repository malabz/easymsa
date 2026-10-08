import { calculateMinimap, type MinimapInput } from '../features/msa-viewer/minimapData';
self.onmessage = (event: MessageEvent<{generation:number; input:MinimapInput}>) => {
  try {
    const image = calculateMinimap(event.data.input);
    self.postMessage({generation:event.data.generation, image}, {transfer:[image.pixels.buffer]});
  } catch { self.postMessage({generation:event.data.generation, error:true}); }
};
