import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { POST } from "./route";
let sequence = 0;
const input = {
  prompt:
    "Create a skincare starter kit under $80 with at least a 35% gross margin.",
  maxPriceCents: null,
  minMarginBps: null,
  category: "all",
  theme: "",
};
const candidate = {
  title: "A gentle skin ritual",
  productIds: ["BL-001", "BL-004", "BL-006"],
  rationale:
    "A cleanser, serum and cream form complementary steps in a daily skincare routine.",
  discountBps: 2500,
};
function request(body: unknown = input, extra: Record<string, string> = {}) {
  return new Request("https://bundlelab.test/api/recommendations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": `test-${sequence++}`,
      ...extra,
    },
    body: JSON.stringify(body),
  });
}
function modelResponse(recommendations: unknown[] = [candidate]) {
  return Response.json({
    status: "completed",
    output: [
      {
        type: "message",
        content: [
          { type: "output_text", text: JSON.stringify({ recommendations }) },
        ],
      },
    ],
  });
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe("recommendations server route with mocked OpenAI transport", () => {
  it("demo makes no external call and is explicitly labeled", async () => {
    vi.stubEnv("BUNDLELAB_MODE", "demo");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const response = await POST(request());
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.mode).toBe("demo");
    expect(body.recommendations).toHaveLength(3);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("accepts a same-origin browser request when Next uses an internal URL hostname", async () => {
    vi.stubEnv("BUNDLELAB_MODE", "demo");
    const response = await POST(
      new Request("http://localhost:3000/api/recommendations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          host: "127.0.0.1:3000",
          origin: "http://127.0.0.1:3000",
          "x-forwarded-for": "host-regression",
        },
        body: JSON.stringify(input),
      }),
    );
    expect(response.status).toBe(200);
  });
  it("AI calls the real transport boundary with strict structured output and returns recalculated figures", async () => {
    vi.stubEnv("BUNDLELAB_MODE", "ai");
    vi.stubEnv("OPENAI_API_KEY", "test-secret-sentinel");
    const fetcher = vi.fn().mockResolvedValue(modelResponse());
    vi.stubGlobal("fetch", fetcher);
    const response = await POST(request());
    const body = await response.json();
    expect(body.mode).toBe("ai");
    expect(body.recommendations[0].totals.revenueCents).toBe(7800);
    expect(body.recommendations[0].totals.costCents).toBe(3440);
    expect(JSON.stringify(body)).not.toContain("test-secret-sentinel");
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/responses");
    const payload = JSON.parse(options.body);
    expect(payload.text.format.strict).toBe(true);
    expect(payload.max_output_tokens).toBe(1800);
    expect(payload.store).toBe(false);
    expect(
      JSON.parse(payload.input).products.every(
        (p: { category: string }) => p.category === "skincare",
      ),
    ).toBe(true);
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });
  it("does not silently fall back when AI configuration or provider fails", async () => {
    vi.stubEnv("BUNDLELAB_MODE", "ai");
    vi.stubEnv("OPENAI_API_KEY", "");
    const missing = await POST(request());
    expect(missing.status).toBe(503);
    expect(await missing.text()).not.toContain('"recommendations"');
    vi.stubEnv("OPENAI_API_KEY", "test-secret-sentinel");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("sensitive upstream detail", { status: 401 }),
        ),
    );
    const failed = await POST(request());
    expect(failed.status).toBe(502);
    const text = await failed.text();
    expect(text).not.toContain("sensitive upstream");
    expect(text).not.toContain("test-secret-sentinel");
  });
  it("never accepts unsupported IDs, duplicate selections, bad margins or repeated sets", async () => {
    vi.stubEnv("BUNDLELAB_MODE", "ai");
    vi.stubEnv("OPENAI_API_KEY", "test-secret-sentinel");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        modelResponse([
          { ...candidate, productIds: ["MISSING", "BL-001"] },
          { ...candidate, productIds: ["BL-001", "BL-001"] },
          { ...candidate, discountBps: 0 },
        ]),
      ),
    );
    const response = await POST(request());
    const body = await response.json();
    expect(body.status).toBe("no_valid_ai_results");
    expect(body.recommendations).toEqual([]);
  });
  it("rejects authoritative model financial fields and malformed output", async () => {
    vi.stubEnv("BUNDLELAB_MODE", "ai");
    vi.stubEnv("OPENAI_API_KEY", "test-secret-sentinel");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(modelResponse([{ ...candidate, priceCents: 1 }])),
    );
    expect((await POST(request())).status).toBe(502);
  });
  it("proves infeasibility before a paid call", async () => {
    vi.stubEnv("BUNDLELAB_MODE", "ai");
    vi.stubEnv("OPENAI_API_KEY", "test-secret-sentinel");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const response = await POST(request({ ...input, maxPriceCents: 1 }));
    const body = await response.json();
    expect(body.status).toBe("infeasible");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("handles incomplete output, refusal, timeout and upstream rate limits explicitly", async () => {
    vi.stubEnv("BUNDLELAB_MODE", "ai");
    vi.stubEnv("OPENAI_API_KEY", "test-secret-sentinel");
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ status: "incomplete", output: [] }),
      )
      .mockResolvedValueOnce(
        Response.json({
          status: "completed",
          output: [{ type: "message", content: [{ type: "refusal" }] }],
        }),
      )
      .mockResolvedValueOnce(new Response("", { status: 429 }));
    vi.stubGlobal("fetch", fetcher);
    expect((await POST(request())).status).toBe(502);
    expect((await POST(request())).status).toBe(422);
    expect((await POST(request())).status).toBe(503);
    vi.spyOn(AbortSignal, "timeout").mockReturnValue(AbortSignal.abort());
    fetcher.mockRejectedValueOnce(new DOMException("Timed out", "AbortError"));
    expect((await POST(request())).status).toBe(504);
  });
  it("rejects oversize inputs, invalid origins, unsupported numeric constraints and arbitrary catalogs", async () => {
    vi.stubEnv("BUNDLELAB_MODE", "demo");
    expect(
      (await POST(request({ ...input, prompt: "a".repeat(501) }))).status,
    ).toBe(400);
    expect(
      (await POST(request(input, { origin: "https://other.test" }))).status,
    ).toBe(403);
    expect(
      (await POST(request({ ...input, prompt: "Create a kit for 3 people" })))
        .status,
    ).toBe(400);
    expect((await POST(request({ ...input, products: [] }))).status).toBe(400);
    expect((await POST(request({ value: "a".repeat(9000) }))).status).toBe(413);
  });
});
