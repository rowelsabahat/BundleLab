import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { POST } from "./route";
let sequence = 0;
const input = {
  draft: {
    title: "Approved pair",
    lines: [
      { productId: "BL-001", quantity: 1 },
      { productId: "BL-004", quantity: 1 },
    ],
    pricing: { mode: "price", priceCents: 6001 },
  },
  tone: "professional",
  expectedPriceCents: 6001,
  importedProducts: [],
};
const plan = {
  titleStyle: "ritual",
  leadStyle: "considered",
  shortFactIds: ["BL-004:name"],
  detailedFactIds: ["BL-004:description", "BL-001:description"],
  sellingPointFactIds: [
    "BL-004:description",
    "bundle:contents",
    "BL-001:description",
  ],
  promotionStyle: "explore",
};
function request(body: unknown = input, headers = {}) {
  return new Request("https://bundlelab.test/api/listings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": `listing-test-${sequence++}`,
      ...headers,
    },
    body: JSON.stringify(body),
  });
}
function upstream(value: unknown = plan) {
  return Response.json({
    status: "completed",
    output: [
      {
        type: "message",
        content: [{ type: "output_text", text: JSON.stringify(value) }],
      },
    ],
  });
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe("listing API with mocked OpenAI transport", () => {
  it("generates a simulated Demo template without a provider call and preserves approved cents", async () => {
    vi.stubEnv("BUNDLELAB_MODE", "demo");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const response = await POST(request());
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.mode).toBe("demo");
    expect(body.priceCents).toBe(6001);
    expect(body.listing.sellingPoints).toHaveLength(3);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("AI calls the provider, supplies only catalog facts and produces grounded editable fields", async () => {
    vi.stubEnv("BUNDLELAB_MODE", "ai");
    vi.stubEnv("OPENAI_API_KEY", "test-secret-sentinel");
    const fetcher = vi.fn().mockResolvedValue(upstream());
    vi.stubGlobal("fetch", fetcher);
    const response = await POST(request());
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.mode).toBe("ai");
    expect(body.listing.detailedDescription).toContain("Dewdrop Gel Cleanser");
    expect(body.priceCents).toBe(6001);
    expect(JSON.stringify(body)).not.toContain("test-secret-sentinel");
    const payload = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(payload.max_output_tokens).toBe(900);
    expect(payload.text.format.strict).toBe(true);
    expect(payload.store).toBe(false);
    const context = JSON.parse(payload.input);
    expect(
      context.facts.every(
        (f: { productId: string | null }) =>
          f.productId === null || ["BL-001", "BL-004"].includes(f.productId),
      ),
    ).toBe(true);
    expect(payload.input).not.toMatch(/priceCents|costCents|discountBps/);
  });
  it("rejects invented claims, unsupported facts, duplicate points and incomplete coverage", async () => {
    vi.stubEnv("BUNDLELAB_MODE", "ai");
    vi.stubEnv("OPENAI_API_KEY", "test-secret-sentinel");
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        upstream({ ...plan, title: "Clinically guaranteed benefits" }),
      )
      .mockResolvedValueOnce(
        upstream({ ...plan, shortFactIds: ["MISSING:name"] }),
      )
      .mockResolvedValueOnce(
        upstream({
          ...plan,
          sellingPointFactIds: [
            "bundle:contents",
            "bundle:contents",
            "bundle:contents",
          ],
        }),
      )
      .mockResolvedValueOnce(
        upstream({
          ...plan,
          detailedFactIds: ["BL-001:description", "bundle:contents"],
        }),
      );
    vi.stubGlobal("fetch", fetcher);
    for (let i = 0; i < 4; i++)
      expect((await POST(request())).status).toBe(502);
  });
  it("rejects price mismatches, unknown IDs, bad quantities, invalid tone and injected financial fields", async () => {
    vi.stubEnv("BUNDLELAB_MODE", "demo");
    expect(
      (await POST(request({ ...input, expectedPriceCents: 1 }))).status,
    ).toBe(409);
    expect(
      (
        await POST(
          request({
            ...input,
            draft: {
              ...input.draft,
              lines: [
                { productId: "MISSING", quantity: 1 },
                input.draft.lines[0],
              ],
            },
          }),
        )
      ).status,
    ).toBe(422);
    expect(
      (
        await POST(
          request({
            ...input,
            draft: {
              ...input.draft,
              lines: [
                { productId: "BL-001", quantity: 0 },
                input.draft.lines[1],
              ],
            },
          }),
        )
      ).status,
    ).toBe(400);
    expect((await POST(request({ ...input, tone: "clinical" }))).status).toBe(
      400,
    );
    expect((await POST(request({ ...input, price: 1 }))).status).toBe(400);
  });
  it("accepts selected merchant-imported facts but rejects seed overrides or unrelated records", async () => {
    vi.stubEnv("BUNDLELAB_MODE", "demo");
    const { seedProducts } = await import("@/lib/catalog");
    const imported = {
      ...seedProducts[0],
      id: "CUSTOM-1",
      name: "Custom gentle balm",
    };
    expect(
      (await POST(request({ ...input, importedProducts: [seedProducts[0]] })))
        .status,
    ).toBe(400);
    expect(
      (await POST(request({ ...input, importedProducts: [imported] }))).status,
    ).toBe(400);
    const selected = {
      ...input,
      draft: {
        ...input.draft,
        lines: [{ productId: "CUSTOM-1", quantity: 1 }, input.draft.lines[1]],
      },
      importedProducts: [imported],
    };
    const response = await POST(request(selected));
    expect(response.status).toBe(200);
    expect((await response.json()).listing.detailedDescription).toContain(
      "Custom gentle balm",
    );
  });
  it("keeps missing configuration, quota, timeout and provider errors explicit without fallback", async () => {
    vi.stubEnv("BUNDLELAB_MODE", "ai");
    vi.stubEnv("OPENAI_API_KEY", "");
    expect((await POST(request())).status).toBe(503);
    vi.stubEnv("OPENAI_API_KEY", "test-secret-sentinel");
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(
          {
            error: {
              code: "credit_balance_exhausted",
              type: "insufficient_quota",
              message: "test-secret-sentinel",
            },
          },
          { status: 429 },
        ),
      )
      .mockResolvedValueOnce(new Response("sensitive detail", { status: 500 }));
    vi.stubGlobal("fetch", fetcher);
    const quota = await POST(request());
    const body = await quota.json();
    expect(body.error.code).toBe("AI_QUOTA_EXHAUSTED");
    expect(JSON.stringify(body)).not.toContain("test-secret-sentinel");
    expect((await POST(request())).status).toBe(502);
    vi.spyOn(AbortSignal, "timeout").mockReturnValue(AbortSignal.abort());
    fetcher.mockRejectedValueOnce(new DOMException("Timeout", "AbortError"));
    expect((await POST(request())).status).toBe(504);
  });
  it("enforces same-origin, JSON and byte limits before any generation", async () => {
    vi.stubEnv("BUNDLELAB_MODE", "demo");
    expect(
      (await POST(request(input, { origin: "https://other.test" }))).status,
    ).toBe(403);
    expect(
      (await POST(request(input, { "Content-Type": "text/plain" }))).status,
    ).toBe(415);
    expect((await POST(request({ content: "x".repeat(20_001) }))).status).toBe(
      413,
    );
  });
});
