import { ANSWERS, ALLOWED } from "./words.js";
import {
  WORD_LENGTH, MAX_GUESSES, LETTERS, upper, lower, score, dayNumber, wordForDay,
  checkGuess, keyStates, shareText, emptyStats, recordResult,
} from "./game.js";

const STATE_KEY = "turkce-wordle-state";
const STATS_KEY = "turkce-wordle-stats";
const KEY_ROWS = ["ertyuıopğü", "asdfghjklşi", "+zcvbnmöç-"];
const WIN_WORDS = ["Dâhi!", "Muhteşem!", "Harika!", "Çok iyi!", "Güzel!", "Kıl payı!"];
const FLIP_MS = 300;

const $ = (s) => document.querySelector(s);
const load = (k, fallback) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; }
};
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

const day = dayNumber();
const answer = wordForDay(ANSWERS, day);
let state = load(STATE_KEY, null);
if (!state || state.day !== day) state = { day, guesses: [], done: false, won: false };
let stats = { ...emptyStats(), ...load(STATS_KEY, {}) };
let current = "";
let busy = false;

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function buildBoard() {
  const board = $("#board");
  for (let r = 0; r < MAX_GUESSES; r++) {
    const row = el("div", "row");
    for (let c = 0; c < WORD_LENGTH; c++) row.append(el("div", "tile"));
    board.append(row);
  }
}

function buildKeyboard() {
  const kb = $("#keyboard");
  for (const keys of KEY_ROWS) {
    const row = el("div", "krow");
    for (const k of keys) {
      const label = k === "+" ? "ENTER" : k === "-" ? "⌫" : upper(k);
      const b = el("button", `key${k === "+" || k === "-" ? " wide" : ""}`, label);
      b.type = "button";
      b.dataset.key = k === "+" ? "Enter" : k === "-" ? "Backspace" : k;
      if (k === "-") b.setAttribute("aria-label", "Sil");
      row.append(b);
    }
    kb.append(row);
  }
  kb.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b) { press(b.dataset.key); b.blur(); }
  });
}

const rowEl = (r) => $("#board").children[r];

function paintRow(r, word, states, animate) {
  const tiles = rowEl(r).children;
  [...word].forEach((ch, i) => {
    const t = tiles[i];
    t.textContent = upper(ch);
    t.classList.add("filled");
    if (!states) return;
    const apply = () => t.classList.add(states[i]);
    if (!animate) return apply();
    setTimeout(() => {
      t.classList.add("flip");
      setTimeout(apply, 250);
    }, i * FLIP_MS);
  });
}

function paintCurrent() {
  const r = state.guesses.length;
  if (r >= MAX_GUESSES) return;
  const tiles = rowEl(r).children;
  const chars = [...current];
  for (let i = 0; i < WORD_LENGTH; i++) {
    tiles[i].textContent = chars[i] ? upper(chars[i]) : "";
    tiles[i].classList.toggle("filled", !!chars[i]);
  }
}

function paintKeys() {
  const ks = keyStates(state.guesses, answer);
  document.querySelectorAll(".key").forEach((b) => {
    b.classList.remove("correct", "present", "absent");
    if (ks[b.dataset.key]) b.classList.add(ks[b.dataset.key]);
  });
}

let toastTimer;
function toast(msg, ms = 1500) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  if (ms) toastTimer = setTimeout(() => t.classList.remove("show"), ms);
}

function shake() {
  const row = rowEl(state.guesses.length);
  row.classList.remove("shake");
  void row.offsetWidth;
  row.classList.add("shake");
}

function press(key) {
  if (state.done || busy) return;
  if (key === "Enter") return submit();
  if (key === "Backspace") { current = [...current].slice(0, -1).join(""); return paintCurrent(); }
  const ch = lower(key);
  if ([...ch].length === 1 && LETTERS.includes(ch) && [...current].length < WORD_LENGTH) {
    current += ch;
    paintCurrent();
  }
}

function submit() {
  const err = checkGuess(current, ALLOWED);
  if (err) { toast(err); return shake(); }
  const r = state.guesses.length;
  const guess = current;
  state.guesses.push(guess);
  current = "";
  const won = guess === answer;
  const lost = !won && state.guesses.length === MAX_GUESSES;
  if (won || lost) {
    state.done = true;
    state.won = won;
    stats = recordResult(stats, day, won, state.guesses.length);
    save(STATS_KEY, stats);
  }
  save(STATE_KEY, state);
  busy = true;
  paintRow(r, guess, score(guess, answer), true);
  setTimeout(() => {
    busy = false;
    paintKeys();
    if (won) {
      rowEl(r).classList.add("win");
      toast(WIN_WORDS[r], 2000);
    } else if (lost) {
      toast(upper(answer), 0);
    }
    if (state.done) setTimeout(showStats, 1800);
  }, WORD_LENGTH * FLIP_MS + 300);
}

function showStats() {
  $("#s-played").textContent = stats.played;
  $("#s-win").textContent = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
  $("#s-streak").textContent = stats.streak;
  $("#s-max").textContent = stats.maxStreak;
  const dist = $("#dist");
  const max = Math.max(1, ...stats.dist);
  dist.replaceChildren(...stats.dist.map((n, i) => {
    const bar = el("div", "bar");
    if (state.won && state.guesses.length === i + 1) bar.classList.add("current");
    const fill = el("span", null, n);
    fill.style.width = `${Math.max(7, (n / max) * 100)}%`;
    bar.append(el("b", null, i + 1), fill);
    return bar;
  }));
  $("#after").classList.toggle("hidden", !state.done);
  $("#stats").showModal();
}

function countdown() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const s = Math.max(0, Math.floor((next - now) / 1000));
  const pad = (n) => String(n).padStart(2, "0");
  $("#countdown").textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  if (s === 0) location.reload();
}

async function share() {
  const text = `${shareText(day, state.guesses, answer, state.won)}\n${location.origin}${location.pathname}`;
  if (navigator.share && matchMedia("(pointer: coarse)").matches) {
    try { await navigator.share({ text }); return; } catch { /* fall back to clipboard */ }
  }
  try {
    await navigator.clipboard.writeText(text);
    toast("Panoya kopyalandı");
  } catch {
    toast("Kopyalanamadı");
  }
}

function init() {
  buildBoard();
  buildKeyboard();
  state.guesses.forEach((g, r) => paintRow(r, g, score(g, answer), false));
  paintKeys();
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || document.querySelector("dialog[open]")) return;
    if (e.key === "Enter" || e.key === "Backspace") { e.preventDefault(); press(e.key); }
    else if (e.key.length === 1) press(e.key);
  });
  document.querySelectorAll("dialog").forEach((d) => {
    d.querySelector(".close").addEventListener("click", () => d.close());
    d.addEventListener("click", (e) => { if (e.target === d) d.close(); });
  });
  $("#help-btn").addEventListener("click", () => $("#help").showModal());
  $("#stats-btn").addEventListener("click", showStats);
  $("#share").addEventListener("click", share);
  countdown();
  setInterval(countdown, 1000);
  if (!localStorage.getItem(STATE_KEY) && !stats.played) $("#help").showModal();
  else if (state.done) showStats();
}

init();
