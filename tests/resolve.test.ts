import { test } from "node:test";
import assert from "node:assert/strict";

/**
 * These encode the rule that matters most: a reading source is only attached
 * when the titles match exactly. Real failures observed during development are
 * baked in as regression tests.
 */
const fold = (raw: string) =>
  raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u3000-\u9fff\uac00-\ud7af]/g, "")
    .replace(/ou/g, "o")
    .replace(/uu/g, "u")
    .replace(/oo/g, "o")
    .replace(/aa/g, "a")
    .replace(/ei/g, "e");

function matches(sourceTitles: string[], candidateTitles: string[]): boolean {
  const src = new Set(sourceTitles.map(fold));
  return candidateTitles.some((c) => src.has(fold(c)));
}

test("Berserk must NOT match Berserk of Gluttony", () => {
  assert.equal(matches(["Berserk"], ["Boushoku no Berserk"]), false);
  assert.equal(matches(["Berserk"], ["Berserk of Gluttony"]), false);
});

test("One Piece must NOT match Shokugeki no Sanji", () => {
  assert.equal(matches(["One Piece"], ["Shokugeki no Sanji"]), false);
});

test("Jujutsu Kaisen must NOT match Jujutsu Kaisen Modulo", () => {
  assert.equal(matches(["Jujutsu Kaisen"], ["Jujutsu Kaisen Modulo"]), false);
});

test("Tokyo Ghoul must NOT match Tokyo Ghoul:re", () => {
  assert.equal(matches(["Tokyo Ghoul"], ["Tokyo Ghoul:re"]), false);
});

test("Chainsaw Man matches itself", () => {
  assert.equal(matches(["Chainsaw Man"], ["Chainsaw Man"]), true);
});

test("romanised variants do match", () => {
  assert.equal(matches(["Toukyou Ghoul"], ["Tokyo Ghoul"]), true);
  assert.equal(matches(["Solo Leveling", "Na Honjaman Level-Up"], ["Na Honjaman Level-Up"]), true);
});

test("punctuation and case are ignored", () => {
  assert.equal(matches(["pride and prejudice"], ["Pride and Prejudice"]), true);
  assert.equal(matches(["Berserk!"], ["Berserk"]), true);
});

import { stripEdition, foldTitle, exactTitleMatch } from "../lib/resolve";

test("only same-story edition qualifiers are stripped", () => {
  // Same story, different presentation -> strip
  assert.equal(stripEdition("One Piece (Official Colored)"), "One Piece");
  assert.equal(stripEdition("Berserk [Deluxe]"), "Berserk");

  // Different works -> must NOT strip
  assert.equal(stripEdition("Tokyo Ghoul (Oneshot)"), "Tokyo Ghoul (Oneshot)");
  assert.equal(stripEdition("Berserk (Fan Colored)"), "Berserk (Fan Colored)");
  assert.equal(stripEdition("Jujutsu Kaisen Modulo"), "Jujutsu Kaisen Modulo");
});

test("exactTitleMatch uses the real resolver rule", () => {
  const src = new Set([foldTitle("Tokyo Ghoul")]);
  assert.equal(exactTitleMatch(src, "Toukyou Ghoul"), true);
  assert.equal(exactTitleMatch(src, "Tokyo Ghoul (Oneshot)"), false);
  assert.equal(exactTitleMatch(src, "Tokyo Ghoul:re"), false);

  const op = new Set([foldTitle("One Piece")]);
  assert.equal(exactTitleMatch(op, "One Piece (Official Colored)"), true);
  assert.equal(exactTitleMatch(op, "Shokugeki no Sanji"), false);
});
