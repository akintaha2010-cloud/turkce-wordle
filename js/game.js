export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;
export const LETTERS = "abcçdefgğhıijklmnoöprsştuüvyz";
const EPOCH = Date.UTC(2026, 9, 20);
const DAY = 86400000;

export const upper = (s) => s.toLocaleUpperCase("tr-TR");
export const lower = (s) => s.toLocaleLowerCase("tr-TR");

export function score(guess, answer) {
  const g = [...guess], a = [...answer];
  const result = Array(g.length).fill("absent");
  const left = {};
  a.forEach((ch, i) => {
    if (g[i] === ch) result[i] = "correct";
    else left[ch] = (left[ch] || 0) + 1;
  });
  g.forEach((ch, i) => {
    if (result[i] !== "correct" && left[ch] > 0) {
      result[i] = "present";
      left[ch]--;
    }
  });
  return result;
}

export function dayNumber(date = new Date()) {
  const local = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((local - EPOCH) / DAY);
}

function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function dailyOrder(words, seed = 2026) {
  const rng = mulberry32(seed), a = words.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function wordForDay(words, day) {
  const order = dailyOrder(words);
  return order[((day % order.length) + order.length) % order.length];
}

export function checkGuess(guess, allowed) {
  if ([...guess].length !== WORD_LENGTH) return "Yeterli harf yok";
  if (!allowed.has(guess)) return "Kelime listesinde yok";
  return null;
}

const RANK = { absent: 0, present: 1, correct: 2 };

export function keyStates(guesses, answer) {
  const keys = {};
  for (const g of guesses) {
    score(g, answer).forEach((s, i) => {
      const ch = [...g][i];
      if (!keys[ch] || RANK[s] > RANK[keys[ch]]) keys[ch] = s;
    });
  }
  return keys;
}

const EMOJI = { correct: "🟩", present: "🟨", absent: "⬛" };

export function shareText(day, guesses, answer, won) {
  const rows = guesses.map((g) => score(g, answer).map((s) => EMOJI[s]).join(""));
  return `Türkçe Wordle #${day + 1} ${won ? guesses.length : "X"}/${MAX_GUESSES}\n\n${rows.join("\n")}`;
}

export function emptyStats() {
  return { played: 0, wins: 0, streak: 0, maxStreak: 0, lastWinDay: null, dist: Array(MAX_GUESSES).fill(0) };
}

export function recordResult(stats, day, won, guessCount) {
  const s = { ...stats, dist: stats.dist.slice() };
  s.played++;
  if (won) {
    s.wins++;
    s.streak = s.lastWinDay === day - 1 ? s.streak + 1 : 1;
    s.maxStreak = Math.max(s.maxStreak, s.streak);
    s.lastWinDay = day;
    s.dist[guessCount - 1]++;
  } else {
    s.streak = 0;
  }
  return s;
}
