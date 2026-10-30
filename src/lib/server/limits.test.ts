import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createLimiter, readLimitedBody } from "./limits";
afterEach(() => vi.useRealTimers());
describe("request protection", () => {
  it("bounds per-key windows, key count, and recovers after expiration", () => {
    const consume = createLimiter(2, 100, 1);
    expect(consume("a", 0)).toBe(true);
    expect(consume("a", 1)).toBe(true);
    expect(consume("a", 2)).toBe(false);
    expect(consume("b", 3)).toBe(false);
    expect(consume("b", 101)).toBe(true);
  });
  it("bounds actual streamed bytes, not just Content-Length", async () => {
    const request = new Request("https://bundlelab.test", {
      method: "POST",
      body: '"' + "a".repeat(8200) + '"',
    });
    await expect(readLimitedBody(request)).rejects.toMatchObject({
      status: 413,
    });
  });
  it("rejects stalled bodies and releases the stream", async () => {
    vi.useFakeTimers();
    const stream = new ReadableStream<Uint8Array>({ start() {} });
    const request = new Request("https://bundlelab.test", {
      method: "POST",
      body: stream,
      duplex: "half",
    } as RequestInit);
    const promise = readLimitedBody(request);
    const check = expect(promise).rejects.toMatchObject({ status: 408 });
    await vi.advanceTimersByTimeAsync(3001);
    await check;
  });
});
