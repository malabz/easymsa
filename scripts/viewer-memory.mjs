/** Separate CDP sampling pass: do not mix debugger overhead into speed results. */
export async function sampleViewerMemory(browser, context, page) {
  const root = await browser.newBrowserCDPSession();
  const main = await context.newCDPSession(page);
  let next = 0, stopped = false, busy = false;
  const sessions = new Map(), pending = new Map(), samples = [];
  root.on("Target.receivedMessageFromTarget", event => {
    const message = JSON.parse(event.message), key = `${event.sessionId}:${message.id}`;
    const finish = pending.get(key);
    if (finish) { pending.delete(key); finish(message.result ?? null); }
  });
  const workerHeap = async targetId => {
    let sessionId = sessions.get(targetId);
    if (!sessionId) {
      ({sessionId} = await root.send("Target.attachToTarget", {targetId, flatten:false}));
      sessions.set(targetId, sessionId);
    }
    const id = ++next, key = `${sessionId}:${id}`;
    const response = new Promise(resolve => {
      const timeout = setTimeout(() => { pending.delete(key); resolve(null); }, 1000);
      pending.set(key, result => { clearTimeout(timeout); resolve(result); });
    });
    await root.send("Target.sendMessageToTarget", {sessionId, message: JSON.stringify({id,method:"Runtime.getHeapUsage"})});
    return response;
  };
  const sample = async () => {
    if (stopped || busy) return;
    busy = true;
    try {
      const mainHeap = await main.send("Runtime.getHeapUsage");
      const {targetInfos} = await root.send("Target.getTargets");
      const workers = await Promise.all(targetInfos.filter(t=>t.type==="worker").map(async target => ({
        target:target.targetId, heap:await workerHeap(target.targetId).catch(()=>null)
      })));
      samples.push({at:Date.now(),main:mainHeap,workers});
    } finally { busy = false; }
  };
  const timer = setInterval(()=>void sample().catch(()=>{}),250);
  await sample();
  return async () => {
    clearInterval(timer);
    while(busy) await new Promise(resolve=>setTimeout(resolve,10));
    await sample(); stopped=true;
    for(const sessionId of sessions.values()) await root.send("Target.detachFromTarget",{sessionId}).catch(()=>{});
    await main.detach(); await root.detach();
    return samples;
  };
}
