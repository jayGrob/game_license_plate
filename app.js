// ── Plate Chase ──────────────────────────────────────────────────────────────
const STORE_KEY = "plateChase.v1";
const RING_CIRC = 2 * Math.PI * 52; // matches r=52 in the progress ring SVG

// game.finds = { ABBR: epochMillis } (USA), game.findsCA = { ABBR: epochMillis } (Canada)
let game = load();

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const g = JSON.parse(raw);
      if (g && typeof g.finds === "object") return { sound: true, findsCA: {}, mode: "usa", ...g };
    }
  } catch (e) { /* corrupted save — start fresh */ }
  return { finds: {}, findsCA: {}, mode: "usa", sound: true };
}

function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify(game));
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

function findsSorted(map) {
  return Object.entries(map)
    .map(([abbr, t]) => ({ abbr, t }))
    .sort((a, b) => a.t - b.t);
}

// Combined, chronologically-sorted find list for whichever region(s) are
// active in the current mode — this is what "trip time", "last spotted", the
// mini-stat cards, and the trip log all read from, so they stay consistent
// with the % complete calc's mode-scoping.
function activeFinds() {
  const us = findsSorted(game.finds).map(f => ({ ...f, ca: false }));
  if (game.mode !== "both") return us;
  const ca = findsSorted(game.findsCA).map(f => ({ ...f, ca: true }));
  return us.concat(ca).sort((a, b) => a.t - b.t);
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

// ── Sound: two-tone car horn for USA (synthesized); a real goal-horn clip for
// Canada — no amount of oscillator trickery beat an actual recording here. ──
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

// Source file (Pixabay, free-use license) is 15s with several bursts back to
// back; the clean single burst is the first ~4s, so playback is hard-stopped
// at 4s rather than trimming/re-encoding the file itself.
let canadaAudio = null;

function canadaHonk() {
  if (!game.sound) return;
  try {
    canadaAudio = canadaAudio || new Audio("sounds/canada-horn.mp3");
    clearTimeout(canadaAudio._stopTimer);
    canadaAudio.currentTime = 0;
    canadaAudio.play().catch(() => { /* blocked without a user gesture — ignore */ });
    canadaAudio._stopTimer = setTimeout(() => {
      canadaAudio.pause();
      canadaAudio.currentTime = 0;
    }, 4000);
  } catch (e) { /* audio unavailable — play on silently */ }
}

// ── Celebration effects: confetti for USA, falling maple leaves for Canada ──
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

function mapleLeaves() {
  const layer = $("confettiLayer");
  for (let i = 0; i < 36; i++) {
    const leaf = document.createElement("div");
    leaf.className = "leaf-bit";
    leaf.textContent = "🍁";
    leaf.style.left = Math.random() * 100 + "vw";
    leaf.style.fontSize = (16 + Math.random() * 14) + "px";
    leaf.style.animationDuration = 2.4 + Math.random() * 2.2 + "s";
    leaf.style.animationDelay = Math.random() * 0.5 + "s";
    layer.appendChild(leaf);
    setTimeout(() => leaf.remove(), 5200);
  }
}

// ── Map ─────────────────────────────────────────────────────────────────────
function buildMap() {
  const showCanada = game.mode === "both";

  $("blockCanada").style.display = showCanada ? "" : "none";
  $("usLabel").style.display = showCanada ? "" : "none";
  $("legendCa").style.display = showCanada ? "" : "none";
  $("foundCAStat").style.display = showCanada ? "" : "none";

  buildGrid($("map"), STATES, game.finds, false);
  if (showCanada) buildGrid($("mapCanada"), CA_PROVINCES, game.findsCA, true);
}

function buildGrid(container, list, foundMap, isCanada) {
  container.innerHTML = "";
  list.forEach(s => {
    const tile = document.createElement("button");
    tile.className = "tile" + (isCanada ? " ca" : "");
    tile.id = "tile-" + s.abbr;
    tile.textContent = s.abbr;
    tile.title = s.name;
    tile.style.gridColumn = s.col + 1;
    tile.style.gridRow = s.row + 1;
    if (s.abbr in foundMap) tile.classList.add("found");
    tile.addEventListener("click", () => openModal(s.abbr, isCanada));
    container.appendChild(tile);
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
    const tile = $("tile-" + s.abbr);
    if (tile) tile.classList.toggle("found", s.abbr in game.finds);
  });
  if (game.mode === "both") {
    CA_PROVINCES.forEach(s => {
      const tile = $("tile-" + s.abbr);
      if (tile) tile.classList.toggle("found", s.abbr in game.findsCA);
    });
  }
}

function renderHero() {
  const showCanada = game.mode === "both";
  const total = showCanada ? 63 : 50;
  const usCount = Object.keys(game.finds).length;
  const caCount = Object.keys(game.findsCA).length;
  const found = usCount + (showCanada ? caCount : 0);
  const pct = Math.round((found / total) * 100);

  $("pctBig").textContent = pct + "%";
  $("ringFill").style.strokeDasharray = RING_CIRC;
  $("ringFill").style.strokeDashoffset = RING_CIRC * (1 - found / total);

  $("foundUSCount").innerHTML = `${usCount}<small>/50</small>`;
  $("foundCACount").innerHTML = `${caCount}<small>/13</small>`;

  // Trip time / last spotted are scoped to whichever region(s) are active,
  // same rule as the % complete calc — in "both" mode they consider USA + CA
  // finds together, in "usa" mode Canada finds are excluded entirely.
  const active = activeFinds();
  $("tripTime").textContent = active.length ? fmtDuration(Date.now() - active[0].t, true) : "—";
  if (active.length) {
    const last = active[active.length - 1];
    const flag = showCanada ? (last.ca ? "🇨🇦 " : "🇺🇸 ") : "";
    $("lastFind").textContent = `${flag}${last.abbr} · ${fmtAgo(last.t)}`;
  } else {
    $("lastFind").textContent = "—";
  }
}

function renderStats() {
  const active = activeFinds();
  const gaps = [];
  for (let i = 1; i < active.length; i++) {
    gaps.push({ ms: active[i].t - active[i - 1].t, from: active[i - 1].abbr, to: active[i].abbr });
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
  active.forEach(f => {
    const day = new Date(f.t).toDateString();
    byDay[day] = (byDay[day] || 0) + 1;
  });
  const best = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];
  $("statBestDay").textContent = best
    ? `${best[1]} plate${best[1] > 1 ? "s" : ""} · ${new Date(best[0]).toLocaleDateString([], { month: "short", day: "numeric" })}`
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

  if (game.mode === "both") {
    const found = Object.keys(game.findsCA).length;
    const row = document.createElement("div");
    row.className = "region-row";
    row.innerHTML = `
      <span class="region-name">🇨🇦 Canada</span>
      <div class="region-bar"><div class="region-fill" style="width:${(found / 13) * 100}%; background:${REGION_COLORS.Canada}"></div></div>
      <span class="region-count">${found} / 13</span>`;
    wrap.appendChild(row);
  }
}

function renderHistory() {
  const active = activeFinds();
  const showCanada = game.mode === "both";
  const list = $("history");
  list.innerHTML = "";
  $("historyEmpty").style.display = active.length ? "none" : "";

  active.slice().reverse().forEach((f, idx) => {
    const num = active.length - idx; // find number (1-based, chronological)
    const prev = active[num - 2];
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="h-num">#${num}</span>
      ${showCanada ? `<span class="h-dot${f.ca ? " ca" : ""}"></span>` : ""}
      <span class="h-state">${PLACE_BY_ABBR[f.abbr].name}</span>
      ${prev ? `<span class="h-gap${f.ca ? " ca" : ""}">+${fmtDuration(f.t - prev.t, true)}</span>` : `<span class="h-gap">first!</span>`}
      <span class="h-when">${fmtClock(f.t)}</span>`;
    li.style.cursor = "pointer";
    li.addEventListener("click", () => openModal(f.abbr, f.ca));
    list.appendChild(li);
  });
}

// ── Modal ───────────────────────────────────────────────────────────────────
let modalAbbr = null;
let modalIsCanada = false;

function plateHTML(s) {
  return `
    <div class="plate" style="background:${s.bg}">
      <div class="plate-state" style="color:${s.ac}">${s.name}</div>
      <div class="plate-serial" style="color:${s.fg}">${s.abbr} · ${s.year || s.confYear}</div>
      <div class="plate-slogan" style="color:${s.ac}">${s.slogan}</div>
    </div>`;
}

function factsHTML(s, isCanada) {
  const facts = isCanada
    ? [["🏛️ Capital", s.cap], ["👥 Population", s.pop], ["🐦 Provincial/Territorial Bird", s.bird], ["🍁 Joined Confederation", s.confYear]]
    : [["🏛️ Capital", s.cap], ["👥 Population", s.pop], ["🐦 State Bird", s.bird], ["⭐ Statehood", `${s.year} (state #${s.order})`]];
  return `<div class="facts">${facts.map(([label, val]) =>
    `<div class="fact"><span class="fact-label">${label}</span><span class="fact-val">${val}</span></div>`
  ).join("")}</div>`;
}

function openModal(abbr, isCanada, celebrate = false) {
  modalAbbr = abbr;
  modalIsCanada = isCanada;
  const s = isCanada ? CA_BY_ABBR[abbr] : STATE_BY_ABBR[abbr];
  const foundMap = isCanada ? game.findsCA : game.finds;
  const foundAt = foundMap[abbr];

  let footer;
  if (celebrate) {
    footer = isCanada
      ? `<div class="found-banner ca">🍁 Spotted! ${s.name} is on the board!</div>`
      : `<div class="found-banner">🎉 Spotted! ${s.name} is on the board!</div>`;
  } else if (foundAt) {
    footer = `
      <div class="found-banner${isCanada ? " ca" : ""}">✅ Spotted ${fmtClock(foundAt)}</div>
      <button class="undo-link" id="btnUndo">oops — remove this find</button>`;
  } else {
    footer = isCanada
      ? `<button class="spot-btn ca" id="btnSpot">🍁 I spotted it!</button>`
      : `<button class="spot-btn" id="btnSpot">📣 I spotted it!</button>`;
  }

  $("modalBody").innerHTML = `
    ${plateHTML(s)}
    <p class="modal-nick">"${s.slogan}" — ${isCanada ? "Canada" : "the " + s.region}</p>
    ${factsHTML(s, isCanada)}
    ${footer}`;

  const spotBtn = $("btnSpot");
  if (spotBtn) spotBtn.addEventListener("click", () => markFound(abbr, isCanada));
  const undoBtn = $("btnUndo");
  if (undoBtn) undoBtn.addEventListener("click", () => unmarkFound(abbr, isCanada));

  $("overlay").classList.remove("hidden");
}

function closeModal() {
  $("overlay").classList.add("hidden");
  modalAbbr = null;
}

function markFound(abbr, isCanada) {
  const foundMap = isCanada ? game.findsCA : game.finds;
  foundMap[abbr] = Date.now();
  save();
  renderAll();
  if (isCanada) { canadaHonk(); mapleLeaves(); }
  else { honk(); confetti(); }
  const tile = $("tile-" + abbr);
  if (tile) {
    tile.classList.add("just-found");
    setTimeout(() => tile.classList.remove("just-found"), 700);
  }
  openModal(abbr, isCanada, true);

  const total = game.mode === "both" ? 63 : 50;
  const found = Object.keys(game.finds).length + (game.mode === "both" ? Object.keys(game.findsCA).length : 0);
  if (found === total) {
    setTimeout(() => {
      confetti(); confetti();
      if (game.mode === "both") mapleLeaves();
      alert(`🏆 ALL ${total} SPOTTED! You are a Plate Chase legend!`);
    }, 800);
  }
}

function unmarkFound(abbr, isCanada) {
  const foundMap = isCanada ? game.findsCA : game.finds;
  delete foundMap[abbr];
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
  const n = Object.keys(game.finds).length + Object.keys(game.findsCA).length;
  if (n === 0 || confirm(`Start a fresh trip? This clears all ${n} spotted plate${n === 1 ? "" : "s"} (USA and Canada).`)) {
    game.finds = {};
    game.findsCA = {};
    save();
    renderAll();
  }
});

$("modalClose").addEventListener("click", closeModal);
$("overlay").addEventListener("click", e => {
  if (e.target === $("overlay")) closeModal();
});

// ── Region picker ───────────────────────────────────────────────────────────
function renderRegionPicker() {
  document.querySelectorAll(".region-option").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.mode === game.mode);
  });
}

function openRegionPicker() {
  renderRegionPicker();
  $("regionOverlay").classList.remove("hidden");
}

function closeRegionPicker() {
  $("regionOverlay").classList.add("hidden");
}

$("btnRegion").addEventListener("click", openRegionPicker);
$("regionModalClose").addEventListener("click", closeRegionPicker);
$("btnRegionDone").addEventListener("click", closeRegionPicker);
$("regionOverlay").addEventListener("click", e => {
  if (e.target === $("regionOverlay")) closeRegionPicker();
});

document.querySelectorAll(".region-option").forEach(btn => {
  btn.addEventListener("click", () => {
    if (game.mode === btn.dataset.mode) return;
    game.mode = btn.dataset.mode;
    save();
    buildMap();
    renderAll();
    renderRegionPicker();
  });
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape") { closeModal(); closeRegionPicker(); }
});

// ── Init ────────────────────────────────────────────────────────────────────
buildMap();
renderAll();
renderSoundBtn();
// keep "trip time" / "ago" labels fresh
setInterval(() => { renderHero(); }, 30000);

// ── PWA: offline support via service worker ─────────────────────────────────
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => { /* offline support unavailable — game still works online */ });
  });
}
