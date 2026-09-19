import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createBraveInspirationSearchProvider,
  deduplicateInspirationHits,
  InspirationSearchError,
  normalizeInspirationResults,
  type InspirationHit,
} from "../src/services/inspiration-search";

const payload = (
  results: Record<string, unknown>[],
): Record<string, unknown> => ({ web: { results } });

const jsonFetch = (
  body: unknown,
  status = 200,
): { fetchFn: typeof fetch; calls: { url: string; init?: RequestInit }[] } => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetchFn = (async (url: string, init?: RequestInit) => {
    calls.push({ url, ...(init ? { init } : {}) });
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }) as unknown as typeof fetch;
  return { fetchFn, calls };
};

const hit = (overrides: Partial<InspirationHit> = {}): InspirationHit => ({
  title: "How to style a satin blouse",
  source: "vogue.com",
  sourceUrl: "https://vogue.com/looks/1",
  imageUrl: null,
  snippet: "Dark denim keeps a fluid blouse grounded.",
  query: "ivory satin blouse outfit",
  ...overrides,
});

test("provider results are normalized into the inspiration hit shape", () => {
  const hits = normalizeInspirationResults(
    payload([
      {
        title: "Five ways to wear a <strong>satin blouse</strong>",
        url: "HTTPS://WWW.Vogue.com:443/fashion/../fashion/satin?ref=1",
        description: "Pair it with <b>dark denim</b> &amp; loafers.",
        thumbnail: { src: "https://img.vogue.com/satin.jpg" },
        profile: { name: "Vogue" },
      },
    ]),
    "ivory satin blouse outfit",
  );

  assert.equal(hits.length, 1);
  assert.deepEqual(hits[0], {
    title: "Five ways to wear a satin blouse",
    source: "Vogue",
    sourceUrl: "https://www.vogue.com/fashion/satin?ref=1",
    imageUrl: "https://img.vogue.com/satin.jpg",
    snippet: "Pair it with dark denim & loafers.",
    query: "ivory satin blouse outfit",
  });
});

test("unsafe URLs, unsafe images, and unusable rows are dropped", () => {
  const hits = normalizeInspirationResults(
    payload([
      { title: "Unsafe", url: "javascript:alert(1)", description: "no" },
      { title: "Relative", url: "//example.com/look" },
      { title: "No URL at all" },
      { title: "", url: "https://example.com/empty-title" },
      {
        title: "Insecure image",
        url: "https://example.com/looks/2",
        thumbnail: { src: "http://example.com/img.jpg" },
      },
      {
        title: "Unsafe image",
        url: "https://example.com/looks/3",
        thumbnail: { src: "data:image/png;base64,AAAA" },
      },
    ]),
    "blouse outfit",
  );

  assert.deepEqual(
    hits.map((value) => value.sourceUrl),
    ["https://example.com/looks/2", "https://example.com/looks/3"],
  );
  assert(hits.every((value) => value.imageUrl === null));
});

test("malformed provider payloads normalize to no results instead of throwing", () => {
  for (const malformed of [
    null,
    "not json at all",
    { web: "unexpected" },
    { web: { results: "unexpected" } },
    {},
  ])
    assert.deepEqual(normalizeInspirationResults(malformed, "blouse"), []);
});

test("duplicate URLs, near-identical titles, and dominant domains are removed", () => {
  const deduplicated = deduplicateInspirationHits([
    hit(),
    hit({ sourceUrl: "https://VOGUE.com/looks/1/" }),
    hit({
      sourceUrl: "https://elle.com/looks/2",
      title: "How to Style a Satin Blouse | Vogue",
    }),
    hit({ sourceUrl: "https://elle.com/looks/3", title: "Denim edit" }),
    hit({ sourceUrl: "https://vogue.com/looks/4", title: "Loafer guide" }),
    hit({ sourceUrl: "https://vogue.com/looks/5", title: "Autumn layering" }),
    hit({ sourceUrl: "https://vogue.com/looks/6", title: "Evening satin" }),
  ]);

  assert.deepEqual(
    deduplicated.map((value) => value.sourceUrl),
    [
      "https://vogue.com/looks/1",
      "https://elle.com/looks/3",
      "https://vogue.com/looks/4",
      "https://vogue.com/looks/5",
    ],
  );
});

test("search sends the generated query with credentials and no user data", async () => {
  const { fetchFn, calls } = jsonFetch(
    payload([
      {
        title: "Satin blouse styling",
        url: "https://example.com/look",
        description: "Dark denim and loafers.",
      },
    ]),
  );
  const provider = createBraveInspirationSearchProvider({
    apiKey: "test-token",
    fetchFn,
  });
  const hits = await provider.search("ivory satin blouse outfit");

  assert.equal(provider.configured, true);
  assert.equal(calls.length, 1);
  const url = new URL(calls[0]!.url);
  assert.equal(url.searchParams.get("q"), "ivory satin blouse outfit");
  assert.equal(url.searchParams.get("safesearch"), "moderate");
  assert.equal(
    (calls[0]!.init?.headers as Record<string, string>)["X-Subscription-Token"],
    "test-token",
  );
  assert.equal(hits[0]?.query, "ivory satin blouse outfit");
  assert.equal(hits[0]?.sourceUrl, "https://example.com/look");
});

test("missing credentials fail fast without any outbound request", async () => {
  let called = 0;
  const fetchFn = (async () => {
    called += 1;
    return new Response("{}");
  }) as unknown as typeof fetch;
  const provider = createBraveInspirationSearchProvider({ fetchFn });

  assert.equal(provider.configured, false);
  await assert.rejects(
    () => provider.search("ivory satin blouse outfit"),
    (error: unknown) =>
      error instanceof InspirationSearchError && error.status === 503,
  );
  assert.equal(called, 0);
});

test("network failures, timeouts, error statuses and unreadable bodies surface typed errors", async () => {
  const cases: [typeof fetch, number][] = [
    [
      (async () => {
        throw new TypeError("fetch failed");
      }) as unknown as typeof fetch,
      502,
    ],
    [
      (async () => {
        const error = new Error("timed out");
        error.name = "TimeoutError";
        throw error;
      }) as unknown as typeof fetch,
      504,
    ],
    [jsonFetch({}, 429).fetchFn, 502],
    [
      (async () =>
        new Response("<html>not json</html>", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        })) as unknown as typeof fetch,
      502,
    ],
  ];
  for (const [fetchFn, status] of cases)
    await assert.rejects(
      () =>
        createBraveInspirationSearchProvider({
          apiKey: "test-token",
          fetchFn,
        }).search("ivory satin blouse outfit"),
      (error: unknown) =>
        error instanceof InspirationSearchError && error.status === status,
    );
});
