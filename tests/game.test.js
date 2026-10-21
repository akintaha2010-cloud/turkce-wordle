import { test } from "node:test";
import assert from "node:assert/strict";
import { score, dayNumber, wordForDay, checkGuess, keyStates, shareText, emptyStats, recordResult, upper, lower } from "../js/game.js";
import { ANSWERS, ALLOWED } from "../js/words.js";

test("score marks correct, present and absent letters", () => {
  assert.deepEqual(score("kalem", "kalem"), Array(5).fill("correct"));
  assert.deepEqual(score("melek", "kalem"), ["present", "absent", "correct", "correct", "present"]);
  assert.deepEqual(score("çorba", "çiçek"), ["correct", "absent", "absent", "absent", "absent"]);
});

test("repeated letters are only marked as often as they appear in the answer", () => {
  assert.deepEqual(score("aaaaa", "araba"), ["correct", "absent", "correct", "absent", "correct"]);
  assert.deepEqual(score("kekik", "kalem"), ["correct", "present", "absent", "absent", "absent"]);
  assert.deepEqual(score("sesli", "kesik"), ["absent", "correct", "correct", "absent", "present"]);
});

test("dotted and dotless i are different letters", () => {
  assert.deepEqual(score("kılıç", "kilit"), ["correct", "absent", "correct", "absent", "absent"]);
  assert.equal(upper("ilik"), "İLİK");
  assert.equal(upper("ılık"), "ILIK");
  assert.equal(lower("IŞIK"), "ışık");
});

test("day number counts local calendar days from the launch date", () => {
  assert.equal(dayNumber(new Date(2026, 9, 20, 0, 1)), 0);
  assert.equal(dayNumber(new Date(2026, 9, 20, 23, 59)), 0);
  assert.equal(dayNumber(new Date(2026, 9, 21, 0, 0)), 1);
  assert.equal(dayNumber(new Date(2027, 9, 20)), 365);
});

test("daily word is stable and does not repeat until the list runs out", () => {
  assert.equal(wordForDay(ANSWERS, 5), wordForDay(ANSWERS, 5));
  const seen = new Set(Array.from({ length: ANSWERS.length }, (_, d) => wordForDay(ANSWERS, d)));
  assert.equal(seen.size, ANSWERS.length);
});

test("word lists are five letters and every answer is a valid guess", () => {
  for (const w of ALLOWED) assert.equal([...w].length, 5, w);
  for (const w of ANSWERS) assert.ok(ALLOWED.has(w), w);
  assert.equal(new Set(ANSWERS).size, ANSWERS.length);
});

test("checkGuess rejects short and unknown words", () => {
  assert.equal(checkGuess("kale", ALLOWED), "Yeterli harf yok");
  assert.equal(checkGuess("qwxyz", ALLOWED), "Kelime listesinde yok");
  assert.equal(checkGuess("kalem", ALLOWED), null);
});

test("keyboard keeps the best state seen for each letter", () => {
  const k = keyStates(["melek", "kalem"], "kalem");
  assert.equal(k.k, "correct");
  assert.equal(k.m, "correct");
  assert.equal(k.e, "correct");
});

test("share text shows the grid without letters", () => {
  assert.equal(shareText(0, ["melek", "kalem"], "kalem", true), "Türkçe Wordle #1 2/6\n\n🟨⬛🟩🟩🟨\n🟩🟩🟩🟩🟩");
  assert.match(shareText(3, ["melek"], "kalem", false), /^Türkçe Wordle #4 X\/6/);
});

test("stats track streaks and guess distribution", () => {
  let s = emptyStats();
  s = recordResult(s, 0, true, 3);
  s = recordResult(s, 1, true, 4);
  assert.equal(s.streak, 2);
  s = recordResult(s, 2, false, 6);
  assert.equal(s.streak, 0);
  s = recordResult(s, 4, true, 2);
  assert.deepEqual({ played: s.played, wins: s.wins, streak: s.streak, maxStreak: s.maxStreak }, { played: 4, wins: 3, streak: 1, maxStreak: 2 });
  assert.deepEqual(s.dist, [0, 1, 1, 1, 0, 0]);
});
