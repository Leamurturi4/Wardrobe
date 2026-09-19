import {
  getSourceHostname,
  normalizeSafeSourceUrl,
  z,
} from "@workspace/api-zod";

// A single normalized styling reference returned by an external search provider.
// Provider-specific payloads never leave this module.
export type InspirationHit = {
  title: string;
  source: string;
  sourceUrl: string;
  imageUrl: string | null;
  snippet: string;
  query: string;
};

export interface InspirationSearchProvider {
  readonly name: string;
  readonly configured: boolean;
  search(query: string): Promise<InspirationHit[]>;
}

export class InspirationSearchError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const DEFAULT_INSPIRATION_SEARCH_ENDPOINT =
  "https://api.search.brave.com/res/v1/web/search";
export const DEFAULT_INSPIRATION_SEARCH_TIMEOUT_MS = 6_000;
export const INSPIRATION_RESULTS_PER_QUERY = 6;
export const INSPIRATION_MAX_RESULTS_PER_SOURCE = 3;

const braveResponseSchema = z
  .object({
    web: z
      .object({
        results: z
          .array(
            z
              .object({
                title: z.string().optional(),
                url: z.string().optional(),
                description: z.string().optional(),
                thumbnail: z
                  .object({ src: z.string().optional() })
                  .passthrough()
                  .optional(),
                profile: z
                  .object({ name: z.string().optional() })
                  .passthrough()
                  .optional(),
              })
              .passthrough(),
          )
          .optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const entities: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&lt;": "<",
  "&gt;": ">",
};

const stripMarkup = (value: string) =>
  value
    .replace(/<[^>]*>/g, " ")
    .replace(
      /&(?:nbsp|amp|quot|#39|apos|lt|gt);/g,
      (entity) => entities[entity] ?? " ",
    )
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();

const titleTokens = (value: string) =>
  new Set(
    value
      .toLocaleLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2),
  );

const nearlyIdentical = (left: string, right: string) => {
  const a = titleTokens(left);
  const b = titleTokens(right);
  if (!a.size || !b.size) return left === right;
  const shared = [...a].filter((token) => b.has(token)).length;
  return shared / new Set([...a, ...b]).size >= 0.8;
};

// Images are optional; only same-origin-safe HTTPS URLs are ever surfaced.
const safeImageUrl = (value: string | undefined): string | null => {
  if (!value) return null;
  const normalized = normalizeSafeSourceUrl(value);
  if (!normalized || !normalized.startsWith("https://")) return null;
  return normalized.length <= 500 ? normalized : null;
};

/** Converts a raw Brave Search payload into schema-shaped inspiration hits. */
export function normalizeInspirationResults(
  payload: unknown,
  query: string,
): InspirationHit[] {
  const parsed = braveResponseSchema.safeParse(payload);
  if (!parsed.success) return [];
  const hits: InspirationHit[] = [];
  for (const result of parsed.data.web?.results ?? []) {
    const sourceUrl = result.url ? normalizeSafeSourceUrl(result.url) : null;
    if (!sourceUrl) continue;
    const source = getSourceHostname(sourceUrl);
    if (!source) continue;
    const title = stripMarkup(result.title ?? "").slice(0, 200);
    if (!title) continue;
    hits.push({
      title,
      source: stripMarkup(result.profile?.name ?? "").slice(0, 200) || source,
      sourceUrl,
      imageUrl: safeImageUrl(result.thumbnail?.src),
      snippet: stripMarkup(result.description ?? "").slice(0, 280),
      query,
    });
  }
  return hits;
}

/**
 * Drops identical URLs, near-identical titles, and over-represented domains so
 * that one syndicated article cannot dominate the extracted style directions.
 */
export function deduplicateInspirationHits(
  hits: readonly InspirationHit[],
  maxPerSource = INSPIRATION_MAX_RESULTS_PER_SOURCE,
): InspirationHit[] {
  const seenUrls = new Set<string>();
  const perSource = new Map<string, number>();
  const kept: InspirationHit[] = [];
  for (const hit of hits) {
    const urlKey = hit.sourceUrl.toLocaleLowerCase().replace(/[#/]+$/, "");
    if (seenUrls.has(urlKey)) continue;
    const host = getSourceHostname(hit.sourceUrl) ?? hit.source;
    const used = perSource.get(host) ?? 0;
    if (used >= maxPerSource) continue;
    if (kept.some((existing) => nearlyIdentical(existing.title, hit.title)))
      continue;
    seenUrls.add(urlKey);
    perSource.set(host, used + 1);
    kept.push(hit);
  }
  return kept;
}

export type BraveSearchOptions = {
  apiKey?: string;
  endpoint?: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  resultsPerQuery?: number;
};

/**
 * Brave Search API provider. Only the generated styling query is sent upstream;
 * no wardrobe IDs, Style DNA, or user identity ever leaves the server here.
 */
export function createBraveInspirationSearchProvider(
  options: BraveSearchOptions,
): InspirationSearchProvider {
  const apiKey = options.apiKey?.trim();
  const endpoint =
    options.endpoint?.trim() || DEFAULT_INSPIRATION_SEARCH_ENDPOINT;
  const fetchFn = options.fetchFn ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_INSPIRATION_SEARCH_TIMEOUT_MS;
  const count = options.resultsPerQuery ?? INSPIRATION_RESULTS_PER_QUERY;
  return {
    name: "brave-search",
    configured: Boolean(apiKey),
    async search(query) {
      if (!apiKey)
        throw new InspirationSearchError(
          503,
          "Inspiration search is not configured",
        );
      const trimmed = query.trim();
      if (!trimmed) return [];
      const url = new URL(endpoint);
      url.searchParams.set("q", trimmed);
      url.searchParams.set("count", String(count));
      url.searchParams.set("safesearch", "moderate");
      url.searchParams.set("result_filter", "web");
      url.searchParams.set("text_decorations", "false");
      url.searchParams.set("spellcheck", "false");
      let response: Response;
      try {
        response = await fetchFn(url.toString(), {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Accept-Encoding": "gzip",
            "X-Subscription-Token": apiKey,
          },
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        const timedOut =
          error instanceof Error &&
          (error.name === "TimeoutError" || error.name === "AbortError");
        throw new InspirationSearchError(
          timedOut ? 504 : 502,
          timedOut
            ? "Inspiration search timed out"
            : "Inspiration search is temporarily unavailable",
        );
      }
      if (!response.ok)
        throw new InspirationSearchError(
          502,
          `Inspiration search failed with status ${response.status}`,
        );
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new InspirationSearchError(
          502,
          "Inspiration search returned an unreadable response",
        );
      }
      return deduplicateInspirationHits(
        normalizeInspirationResults(payload, trimmed),
      );
    },
  };
}
