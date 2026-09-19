import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getSourceHostname,
  normalizeSafeSourceUrl,
  sourceReferenceSchema,
} from "@workspace/api-zod";

test("source references allow and normalize only HTTP and HTTPS URLs", () => {
  assert.equal(
    normalizeSafeSourceUrl("  HTTPS://WWW.Example.COM:443/a/../looks?id=4  "),
    "https://www.example.com/looks?id=4",
  );
  assert.equal(
    sourceReferenceSchema.parse({
      provider: "Example",
      title: "A source look",
      url: "HTTP://Example.com:80/look",
    }).url,
    "http://example.com/look",
  );
});

test("source references reject unsafe protocols and malformed URLs", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,<h1>unsafe</h1>",
    "file:///C:/private.txt",
    "ftp://example.com/look",
    "https://",
    "not a url",
    "//example.com/look",
  ]) {
    assert.equal(normalizeSafeSourceUrl(url), null);
    assert.equal(
      sourceReferenceSchema.safeParse({
        provider: "Example",
        title: "Unsafe source",
        url,
      }).success,
      false,
    );
  }
});

test("hostname extraction returns a normalized source name", () => {
  assert.equal(
    getSourceHostname("https://WWW.Vogue.com/fashion/article#look"),
    "vogue.com",
  );
  assert.equal(getSourceHostname("javascript:alert(1)"), null);
});
