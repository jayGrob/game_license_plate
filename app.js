// ── Plate Chase ──────────────────────────────────────────────────────────────
const STORE_KEY = "plateChase.v1";
const RING_CIRC = 2 * Math.PI * 52; // matches r=52 in the progress ring SVG

// game.finds = { ABBR: epochMillis }
let game = load();

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const g = JSON.parse(raw);
      if (g && typeof g.finds === "object") return { sound: true, ...g };
    }
  } catch (e) { /* corrupted save — start fresh */ }
  return { finds: {}, sound: true };
}

function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify(game));
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

function findsSorted() {
  return Object.entries(game.finds)
    .map(([abbr, t]) => ({ abbr, t }))
    .sort((a, b) => a.t - b.t);
}

function fmtDuration(ms, short = false) {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return short ? `${m}m` : `${m}m ${sec}s`;
  return `${sec}s`;
}

function fmtAgo(t) {
  return fmtDuration(Date.now() - t, true) + " ago";
}

function fmtClock(t) {
  const d = new Date(t);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return sameDay ? time : d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + time;
}

// ── Sound: two-tone car horn via Web Audio ──────────────────────────────────
let audioCtx = null;

function honk() {
  if (!game.sound) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const t0 = audioCtx.currentTime;
    // two bursts: honk-hooonk
    burst(t0, 0.16);
    burst(t0 + 0.24, 0.34);
  } catch (e) { /* audio unavailable — play on silently */ }
}

function burst(start, dur) {
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(0.25, start + 0.015);
  gain.gain.setValueAtTime(0.25, start + dur - 0.03);
  gain.gain.linearRampToValueAtTime(0, start + dur);

  const filter = audioCtx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1800;

  gain.connect(filter).connect(audioCtx.destination);

  // classic horn = two notes a major third apart
  [370, 466].forEach(freq => {
    const osc = audioCtx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    osc.connect(gain);
    osc.start(start);
    osc.stop(start + dur);
  });
}

// ── Confetti ────────────────────────────────────────────────────────────────
function confetti() {
  const layer = $("confettiLayer");
  const colors = ["#fbbf24", "#f97316", "#34d399", "#7aa6d6", "#e07a5f", "#f2cc8f", "#ffffff"];
  for (let i = 0; i < 90; i++) {
    const bit = document.createElement("div");
    bit.className = "confetti-bit";
    bit.style.left = Math.random() * 100 + "vw";
    bit.style.background = colors[Math.floor(Math.random() * colors.length)];
    bit.style.animationDuration = 1.4 + Math.random() * 1.8 + "s";
    bit.style.animationDelay = Math.random() * 0.5 + "s";
    bit.style.transform = `rotate(${Math.random() * 360}deg)`;
    layer.appendChild(bit);
    setTimeout(() => bit.remove(), 4200);
  }
}

// ── Map ─────────────────────────────────────────────────────────────────────
function buildMap() {
  const map = $("map");
  map.innerHTML = "";
  STATES.forEach(s => {
    const tile = document.createElement("button");
    tile.className = "tile";
    tile.id = "tile-" + s.abbr;
    tile.textContent = s.abbr;
    tile.title = s.name;
    tile.style.gridColumn = s.col + 1;
    tile.style.gridRow = s.row + 1;
    tile.addEventListener("click", () => openModal(s.abbr));
    map.appendChild(tile);
  });
}

// ── Rendering ───────────────────────────────────────────────────────────────
function renderAll() {
  renderMap();
  renderHero();
  renderStats();
  renderRegions();
  renderHistory();
}

function renderMap() {
  STATES.forEach(s => {
    $("tile-" + s.abbr).classList.toggle("found", s.abbr in game.finds);
  });
}

function renderHero() {
  const finds = findsSorted();
  const n = finds.length;
  const pct = Math.round((n / 50) * 100);

  $("pctBig").textContent = pct + "%";
  $("ringFill").style.strokeDasharray = RING_CIRC;
  $("ringFill").style.strokeDashoffset = RING_CIRC * (1 - n / 50);
  $("foundCount").innerHTML = `${n}<small>/50</small>`;

  $("tripTime").textContent = n ? fmtDuration(Date.now() - finds[0].t, true) : "—";
  if (n) {
    const last = finds[n - 1];
    $("lastFind").textContent = STATE_BY_ABBR[last.abbr].abbr + " · " + fmtAgo(last.t);
  } else {
    $("lastFind").textContent = "—";
  }
}

function renderStats() {
  const finds = findsSorted();
  const gaps = [];
  for (let i = 1; i < finds.length; i++) {
    gaps.push({ ms: finds[i].t - finds[i - 1].t, from: finds[i - 1].abbr, to: finds[i].abbr });
  }

  if (gaps.length) {
    const fastest = gaps.reduce((a, b) => (b.ms < a.ms ? b : a));
    const slowest = gaps.reduce((a, b) => (b.ms > a.ms ? b : a));
    const avg = gaps.reduce((sum, g) => sum + g.ms, 0) / gaps.length;
    $("statFastest").textContent = `${fmtDuration(fastest.ms)} (${fastest.from} → ${fastest.to})`;
    $("statRarest").textContent = `${fmtDuration(slowest.ms, true)} until ${slowest.to}`;
    $("statPace").textContent = fmtDuration(avg, true);
  } else {
    $("statFastest").textContent = "—";
    $("statRarest").textContent = "—";
    $("statPace").textContent = "—";
  }

  // best day
  const byDay = {};
  finds.forEach(f => {
    const day = new Date(f.t).toDateString();
    byDay[day] = (byDay[day] || 0) + 1;
  });
  const best = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];
  $("statBestDay").textContent = best
    ? `${best[1]} state${best[1] > 1 ? "s" : ""} · ${new Date(best[0]).toLocaleDateString([], { month: "short", day: "numeric" })}`
    : "—";
}

function renderRegions() {
  const wrap = $("regions");
  wrap.innerHTML = "";
  REGIONS.forEach(r => {
    const total = STATES.filter(s => s.region === r).length;
    const found = STATES.filter(s => s.region === r && s.abbr in game.finds).length;
    const row = document.createElement("div");
    row.className = "region-row";
    row.innerHTML = `
      <span class="region-name">${r}</span>
      <div class="region-bar"><div class="region-fill" style="width:${(found / total) * 100}%; background:${REGION_COLORS[r]}"></div></div>
      <span class="region-count">${found} / ${total}</span>`;
    wrap.appendChild(row);
  });
}

function renderHistory() {
  const finds = findsSorted();
  const list = $("history");
  list.innerHTML = "";
  $("historyEmpty").style.display = finds.length ? "none" : "";

  finds.slice().reverse().forEach((f, idx) => {
    const i = finds.length - idx; // find number (1-based, chronological)
    const prev = finds[i - 2];
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="h-num">#${i}</span>
      <span class="h-state">${STATE_BY_ABBR[f.abbr].name}</span>
      ${prev ? `<span class="h-gap">+${fmtDuration(f.t - prev.t, true)}</span>` : `<span class="h-gap">first!</span>`}
      <span class="h-when">${fmtClock(f.t)}</span>`;
    li.style.cursor = "pointer";
    li.addEventListener("click", () => openModal(f.abbr));
    list.appendChild(li);
  });
}

// ── Modal ───────────────────────────────────────────────────────────────────
let modalAbbr = null;

function plateHTML(s) {
  return `
    <div class="plate" style="background:${s.bg}">
      <div class="plate-state" style="color:${s.ac}">${s.name}</div>
      <div class="plate-serial" style="color:${s.fg}">${s.abbr} · ${s.year}</div>
      <div class="plate-slogan" style="color:${s.ac}">${s.slogan}</div>
    </div>`;
}

function factsHTML(s) {
  const facts = [
    ["🏛️ Capital", s.cap],
    ["👥 Population", s.pop],
    ["🐦 State Bird", s.bird],
    ["⭐ Statehood", `${s.year} (state #${s.order})`],
  ];
  return `<div class="facts">${facts.map(([label, val]) =>
    `<div class="fact"><span class="fact-label">${label}</span><span class="fact-val">${val}</span></div>`
  ).join("")}</div>`;
}

function openModal(abbr, celebrate = false) {
  modalAbbr = abbr;
  const s = STATE_BY_ABBR[abbr];
  const foundAt = game.finds[abbr];

  let footer;
  if (celebrate) {
    footer = `<div class="found-banner">🎉 Spotted! ${s.name} is on the board!</div>`;
  } else if (foundAt) {
    footer = `
      <div class="found-banner">✅ Spotted ${fmtClock(foundAt)}</div>
      <button class="undo-link" id="btnUndo">oops — remove this find</button>`;
  } else {
    footer = `<button class="spot-btn" id="btnSpot">📣 I spotted it!</button>`;
  }

  $("modalBody").innerHTML = `
    ${plateHTML(s)}
    <p class="modal-nick">"${s.slogan}" — the ${s.region}</p>
    ${factsHTML(s)}
    ${footer}`;

  const spotBtn = $("btnSpot");
  if (spotBtn) spotBtn.addEventListener("click", () => markFound(abbr));
  const undoBtn = $("btnUndo");
  if (undoBtn) undoBtn.addEventListener("click", () => unmarkFound(abbr));

  $("overlay").classList.remove("hidden");
}

function closeModal() {
  $("overlay").classList.add("hidden");
  modalAbbr = null;
}

function markFound(abbr) {
  game.finds[abbr] = Date.now();
  save();
  renderAll();
  honk();
  confetti();
  const tile = $("tile-" + abbr);
  tile.classList.add("just-found");
  setTimeout(() => tile.classList.remove("just-found"), 700);
  openModal(abbr, true);
  if (Object.keys(game.finds).length === 50) {
    setTimeout(() => {
      confetti(); confetti();
      alert("🏆 ALL 50 STATES! You are a Plate Chase legend!");
    }, 800);
  }
}

function unmarkFound(abbr) {
  delete game.finds[abbr];
  save();
  renderAll();
  closeModal();
}

// ── Top bar controls ────────────────────────────────────────────────────────
function renderSoundBtn() {
  $("btnSound").textContent = game.sound ? "🔊" : "🔇";
  $("btnSound").classList.toggle("muted", !game.sound);
}

$("btnSound").addEventListener("click", () => {
  game.sound = !game.sound;
  save();
  renderSoundBtn();
  if (game.sound) honk();
});

$("btnReset").addEventListener("click", () => {
  const n = Object.keys(game.finds).length;
  if (n === 0 || confirm(`Start a fresh trip? This clears all ${n} spotted state${n === 1 ? "" : "s"}.`)) {
    game.finds = {};
    save();
    renderAll();
  }
});

$("modalClose").addEventListener("click", closeModal);
$("overlay").addEventListener("click", e => {
  if (e.target === $("overlay")) closeModal();
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeModal();
});

// ── Init ────────────────────────────────────────────────────────────────────
buildMap();
renderAll();
renderSoundBtn();
// keep "trip time" / "ago" labels fresh
setInterval(() => { renderHero(); }, 30000);
