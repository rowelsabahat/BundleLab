import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { requestStructuredOutput } from "./openai-transport";
const options = {
  name: "qa_fixture",
  schema: {},
  instructions: "Return a test plan.",
  input: {},
  maxOutputTokens: 10,
};
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("bounded upstream responses", () => {
  it("preserves timeout classification when cancellation interrupts an error-body read", async () => {
    vi.stubEnv("OPENAI_API_KEY", "qa-fake-key");
    const abort = new AbortController();
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        abort.abort();
        controller.error(new DOMException("Cancelled", "AbortError"));
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(body, { status: 429 })),
    );
    await expect(
      requestStructuredOutput(options, abort.signal),
    ).rejects.toMatchObject({ code: "AI_TIMEOUT", status: 504 });
  });
  it("cancels oversized upstream content and never returns its text", async () => {
    vi.stubEnv("OPENAI_API_KEY", "qa-fake-key");
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(64_001));
      },
      cancel,
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body)));
    await expect(
      requestStructuredOutput(options, new AbortController().signal),
    ).rejects.toMatchObject({ code: "INVALID_AI_RESPONSE", status: 502 });
    expect(cancel).toHaveBeenCalledOnce();
  });
});
