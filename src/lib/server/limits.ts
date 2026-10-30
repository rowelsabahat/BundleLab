import "server-only";
export class RequestError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export function createLimiter(max: number, durationMs: number, maxKeys = 1000) {
  const windows = new Map<string, { start: number; count: number }>();
  return (key: string, now = Date.now()) => {
    for (const [id, window] of windows)
      if (now - window.start >= durationMs) windows.delete(id);
    let window = windows.get(key);
    if (!window) {
      if (windows.size >= maxKeys) return false;
      window = { start: now, count: 0 };
      windows.set(key, window);
    }
    if (window.count >= max) return false;
    window.count++;
    return true;
  };
}
export const consumeRequest = createLimiter(6, 60_000);
export const consumeAiBudget = createLimiter(30, 3_600_000, 1);
let active = 0;
export function acquireAiSlot() {
  if (active >= 2) return null;
  active++;
  return () => {
    active--;
  };
}
export async function readLimitedBody(request: Request, maximum = 8192) {
  if (Number(request.headers.get("content-length")) > maximum)
    throw new RequestError(
      "BODY_TOO_LARGE",
      "Request is too large. Shorten your prompt.",
      413,
    );
  const reader = request.body?.getReader();
  if (!reader)
    throw new RequestError("INVALID_INPUT", "Enter a bundle request.", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      void reader.cancel();
      reject(
        new RequestError(
          "REQUEST_TIMEOUT",
          "Request took too long to arrive. Try again.",
          408,
        ),
      );
    }, 3000);
  });
  try {
    await Promise.race([
      (async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > maximum) {
            void reader.cancel();
            throw new RequestError(
              "BODY_TOO_LARGE",
              "Request is too large. Shorten your prompt.",
              413,
            );
          }
          chunks.push(value);
        }
      })(),
      timeout,
    ]);
    const buffer = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.length;
    }
    try {
      return JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(buffer),
      ) as unknown;
    } catch {
      throw new RequestError(
        "INVALID_INPUT",
        "Send valid JSON with your bundle request.",
        400,
      );
    }
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
}
