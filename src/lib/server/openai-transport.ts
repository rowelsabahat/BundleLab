import "server-only";
import { z } from "zod";
import { RequestError } from "./limits";
const envelopeSchema = z.object({
  status: z.string(),
  output: z.array(
    z.object({
      type: z.string(),
      content: z
        .array(z.object({ type: z.string(), text: z.string().optional() }))
        .optional(),
    }),
  ),
});
async function boundedText(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Missing response body.");
  let text = "";
  let bytes = 0;
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 64_000) {
        void reader.cancel();
        throw new Error("Oversized AI response.");
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}
export async function requestStructuredOutput(
  options: {
    name: string;
    schema: Record<string, unknown>;
    instructions: string;
    input: unknown;
    maxOutputTokens: number;
  },
  signal: AbortSignal,
): Promise<unknown> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key)
    throw new RequestError(
      "NOT_CONFIGURED",
      "AI Mode needs a server-side API key. Configure it and restart; Demo Mode is not substituted automatically.",
      503,
    );
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      signal,
      cache: "no-store",
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini",
        store: false,
        max_output_tokens: options.maxOutputTokens,
        instructions: options.instructions,
        input: JSON.stringify(options.input),
        text: {
          format: {
            type: "json_schema",
            name: options.name,
            strict: true,
            schema: options.schema,
          },
        },
      }),
    });
    if (!response.ok) {
      let code = "";
      let type = "";
      try {
        const body: unknown = JSON.parse(await boundedText(response));
        const parsed = z
          .object({
            error: z.object({
              code: z.string().nullable().optional(),
              type: z.string().optional(),
            }),
          })
          .safeParse(body);
        if (parsed.success) {
          code = parsed.data.error.code ?? "";
          type = parsed.data.error.type ?? "";
        }
      } catch {
        /* Only allowlisted classifications are returned; never echo provider details. */
      }
      // An aborted error-body read is a timeout/cancellation, not an HTTP retry hint.
      signal.throwIfAborted();
      if (response.status === 429) {
        if (
          type === "insufficient_quota" ||
          [
            "credit_balance_exhausted",
            "insufficient_quota",
            "project_spend_limit_exceeded",
            "organization_spend_limit_exceeded",
            "organization_usage_limit_exceeded",
          ].includes(code)
        )
          throw new RequestError(
            "AI_QUOTA_EXHAUSTED",
            "OpenAI API credits or usage quota are exhausted. Check API billing and limits before retrying. Your existing draft is preserved; no demo copy was substituted.",
            503,
          );
        throw new RequestError(
          "AI_RATE_LIMIT",
          "The AI service is temporarily rate limited. Wait before retrying. Your draft is preserved; no demo content was substituted.",
          503,
        );
      }
      if (response.status === 401 || response.status === 403)
        throw new RequestError(
          "AI_AUTHENTICATION",
          "OpenAI rejected the server API credentials or permissions. Check the API key and project access; your draft is preserved.",
          502,
        );
      throw new RequestError(
        "AI_UNAVAILABLE",
        "The AI service could not complete this request. Check the server configuration or try again later. No demo results were substituted.",
        502,
      );
    }
    const envelope = envelopeSchema.parse(
      JSON.parse(await boundedText(response)),
    );
    if (envelope.status !== "completed")
      throw new RequestError(
        "AI_INCOMPLETE",
        "The AI response was incomplete. Try again; your existing draft is preserved.",
        502,
      );
    const content = envelope.output
      .filter((o) => o.type === "message")
      .flatMap((o) => o.content ?? []);
    if (content.some((c) => c.type === "refusal"))
      throw new RequestError(
        "AI_REFUSAL",
        "The AI service declined this request. No content was replaced.",
        422,
      );
    return JSON.parse(
      content
        .filter((c) => c.type === "output_text")
        .map((c) => c.text ?? "")
        .join(""),
    ) as unknown;
  } catch (error) {
    if (error instanceof RequestError) throw error;
    if (signal.aborted)
      throw new RequestError(
        "AI_TIMEOUT",
        "The AI request timed out or was cancelled. Your draft is preserved; no demo content was substituted.",
        504,
      );
    throw new RequestError(
      "INVALID_AI_RESPONSE",
      "The AI service returned unreadable content or could not be reached. Your existing draft is preserved.",
      502,
    );
  }
}
