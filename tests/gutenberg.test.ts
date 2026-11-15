import { test } from "node:test";
import assert from "node:assert/strict";
import { splitChapters } from "../lib/providers/gutenberg";

const sample = `
CHAPTER I

It is a truth universally acknowledged, that a single man in possession of a good
fortune must be in want of a wife. ${"word ".repeat(120)}

CHAPTER II

Mr Bennet was among the earliest of those who waited on Mr Bingley. ${"word ".repeat(120)}

CHAPTER III

Not all that Mrs Bennet, however, with the assistance of her five daughters,
could ask on the subject was sufficient to draw from her husband. ${"word ".repeat(120)}
`;

test("splits on CHAPTER headings", () => {
  const ch = splitChapters(sample);
  assert.equal(ch.length, 3);
  assert.match(ch[0].title, /CHAPTER I$/);
  assert.match(ch[0].body, /truth universally acknowledged/);
  assert.match(ch[2].body, /five daughters/);
});

test("chapter titles contain no stray brackets or trailing dots", () => {
  for (const c of splitChapters(sample)) {
    assert.ok(!c.title.includes("]"), `bad title: ${c.title}`);
    assert.ok(!c.title.endsWith("."), `bad title: ${c.title}`);
  }
});

test("text without headings is chunked into parts", () => {
  const plain = Array.from({ length: 40 }, (_, i) => `Paragraph ${i}. ${"lorem ipsum ".repeat(40)}`).join("\n\n");
  const ch = splitChapters(plain);
  assert.ok(ch.length > 1, "should produce multiple parts");
  assert.equal(ch[0].title, "Part 1");
});

test("chapters are never empty strings", () => {
  for (const c of splitChapters(sample)) assert.ok(c.body.trim().length > 50);
});
