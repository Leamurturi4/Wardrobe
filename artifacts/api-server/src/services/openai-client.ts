import { z } from "@workspace/api-zod";

export const DEFAULT_OPENAI_MODEL = "gpt-5.4-mini";
export const OPENAI_RESPONSES_ENDPOINT = "https://api.openai.com/v1/responses";

export interface AIImageInput {
  bytes: Buffer;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
}

export type OpenAIErrorDiagnostic = {
  provider: "openai";
  model: string;
  status?: number;
  errorType: string;
  errorCode?: string;
};

export class AIProviderError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly diagnostic?: OpenAIErrorDiagnostic,
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}

export interface OpenAIClientOptions {
  apiKey?: string;
  model?: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  onError?: (diagnostic: OpenAIErrorDiagnostic) => void;
}

export interface OpenAIStructuredClient {
  generateJson(input: {
    prompt: string;
    responseSchema: unknown;
    schemaName?: string;
    image?: AIImageInput;
    maxOutputTokens?: number;
  }): Promise<unknown>;
}

const providerErrorSchema = z
  .object({
    error: z
      .object({
        type: z.string().optional(),
        code: z.union([z.string(), z.number()]).nullish(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const responseSchema = z
  .object({
    status: z.string().optional(),
    output_text: z.string().optional(),
    output: z
      .array(
        z
          .object({
            type: z.string().optional(),
            content: z
              .array(
                z
                  .object({
                    type: z.string().optional(),
                    text: z.string().optional(),
                  })
                  .passthrough(),
              )
              .optional(),
          })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough();

const safeSchemaName = (value: string | undefined) => {
  const normalized = (value || "structured_response")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 64);
  return normalized || "structured_response";
};

function extractOutputText(payload: unknown): string {
  const parsed = responseSchema.safeParse(payload);
  if (!parsed.success) return "";
  if (parsed.data.status && parsed.data.status !== "completed") return "";
  if (parsed.data.output_text?.trim()) return parsed.data.output_text;
  return (parsed.data.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((content) => content.type === "output_text")
    .map((content) => content.text ?? "")
    .join("");
}

const safeDiagnosticValue = (value: string | undefined) =>
  value && /^[a-zA-Z0-9_.-]{1,64}$/.test(value) ? value : undefined;

function providerFailure(
  status: number,
  providerPayload: unknown,
  model: string,
): { status: number; message: string; diagnostic: OpenAIErrorDiagnostic } {
  const parsed = providerErrorSchema.safeParse(providerPayload);
  const providerType = safeDiagnosticValue(
    parsed.success ? parsed.data.error?.type : undefined,
  );
  const rawCode = parsed.success ? parsed.data.error?.code : undefined;
  const errorCode = safeDiagnosticValue(
    rawCode == null ? undefined : String(rawCode),
  );
  let publicStatus = 502;
  let message = "AI is temporarily unavailable. You can continue manually.";
  let errorType = providerType || "provider_error";
  if (status === 401 || status === 403) {
    message = "AI authentication failed. You can continue manually.";
    errorType = providerType || "authentication_error";
  } else if (status === 404) {
    message =
      "The configured AI model is unavailable. You can continue manually.";
    errorType = providerType || "model_unavailable";
  } else if (status === 400 || status === 422) {
    message = "AI could not process this request. You can continue manually.";
    errorType = providerType || "bad_request";
  } else if (status === 429) {
    publicStatus = 503;
    message =
      "AI capacity is temporarily unavailable. You can continue manually.";
    errorType = providerType || "rate_limit";
  } else if (status >= 500) {
    errorType = providerType || "provider_5xx";
  }
  return {
    status: publicStatus,
    message,
    diagnostic: {
      provider: "openai",
      model,
      status,
      errorType,
      ...(errorCode ? { errorCode } : {}),
    },
  };
}

export function createOpenAIStructuredClient(
  options: OpenAIClientOptions,
): OpenAIStructuredClient {
  const apiKey = options.apiKey?.trim();
  const model = options.model?.trim() || DEFAULT_OPENAI_MODEL;
  const fetchFn = options.fetchFn ?? fetch;
  const timeoutMs = options.timeoutMs ?? 20_000;
  const fail = (
    status: number,
    message: string,
    diagnostic: OpenAIErrorDiagnostic,
  ): never => {
    options.onError?.(diagnostic);
    throw new AIProviderError(status, message, diagnostic);
  };

  return {
    async generateJson(input) {
      if (!apiKey)
        return fail(503, "AI is not configured. You can continue manually.", {
          provider: "openai",
          model,
          errorType: "missing_api_key",
        });

      let response: Response;
      try {
        response = await fetchFn(OPENAI_RESPONSES_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          signal: AbortSignal.timeout(timeoutMs),
          body: JSON.stringify({
            model,
            store: false,
            input: [
              {
                role: "user",
                content: [
                  { type: "input_text", text: input.prompt },
                  ...(input.image
                    ? [
                        {
                          type: "input_image",
                          image_url: `data:${input.image.mimeType};base64,${input.image.bytes.toString("base64")}`,
                          detail: "high",
                        },
                      ]
                    : []),
                ],
              },
            ],
            max_output_tokens: input.maxOutputTokens ?? 2048,
            text: {
              format: {
                type: "json_schema",
                name: safeSchemaName(input.schemaName),
                strict: true,
                schema: input.responseSchema,
              },
            },
          }),
        });
      } catch (error) {
        const timedOut =
          error instanceof Error &&
          (error.name === "TimeoutError" || error.name === "AbortError");
        return fail(
          timedOut ? 504 : 502,
          timedOut
            ? "AI timed out. You can continue manually."
            : "AI is temporarily unavailable. You can continue manually.",
          {
            provider: "openai",
            model,
            errorType: timedOut ? "timeout" : "network_error",
          },
        );
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        return fail(
          502,
          "AI returned an unreadable result. You can continue manually.",
          {
            provider: "openai",
            model,
            status: response.status,
            errorType: "invalid_response",
          },
        );
      }
      if (!response.ok) {
        const failure = providerFailure(response.status, payload, model);
        return fail(failure.status, failure.message, failure.diagnostic);
      }
      const output = extractOutputText(payload);
      if (!output)
        return fail(
          502,
          "AI returned no structured result. You can continue manually.",
          {
            provider: "openai",
            model,
            status: response.status,
            errorType: "missing_structured_output",
          },
        );
      try {
        return JSON.parse(output) as unknown;
      } catch {
        return fail(
          502,
          "AI returned invalid JSON. You can continue manually.",
          {
            provider: "openai",
            model,
            status: response.status,
            errorType: "malformed_structured_output",
          },
        );
      }
    },
  };
}
