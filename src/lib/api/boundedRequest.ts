import { EasyMsaApiError, parseApiError } from "./client";

/** Keep the deadline active while reading the response body, not just its headers. */
export async function boundedRequest<T>(url: string, options: RequestInit, read: (response: Response) => Promise<T>, timeout = 20_000): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort(options.signal?.reason);
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) abort();
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { timedOut = true; controller.abort(); reject(new EasyMsaApiError({ code: "LOAD_TIMEOUT", message: "Loading timed out. Retry the request." })); }, timeout);
  });
  try {
    return await Promise.race([deadline, (async () => {
      const result = await fetch(url, { ...options, signal: controller.signal });
      if (!result.ok) throw await parseApiError(result, "The request could not be completed.");
      return read(result);
    })()]);
  } catch (error) {
    if (timedOut) throw new EasyMsaApiError({ code: "LOAD_TIMEOUT", message: "Loading timed out. Retry the request." });
    if (options.signal?.aborted || error instanceof EasyMsaApiError) throw error;
    if (error instanceof TypeError) throw new EasyMsaApiError({ code: "NETWORK_FAILURE", message: "Check your connection and retry." });
    throw new EasyMsaApiError({ code: "INCOMPATIBLE_RESULT", message: "This result format could not be read." });
  } finally {
    clearTimeout(timer!);
    options.signal?.removeEventListener("abort", abort);
  }
}
