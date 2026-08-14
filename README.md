# Plate Chase 🚗

The Great American (and Canadian) License Plate Hunt — a road-trip game for the whole family. Spot a state or province's license plate, tap it on the map, and log your find. No installs, no accounts, no backend.

## Play it

Just open [`index.html`](index.html) in a browser. That's it.

- **Desktop/laptop:** double-click the file.
- **Phone/tablet:** loose local files are awkward to open on mobile, so host the folder somewhere reachable (e.g. [GitHub Pages](https://pages.github.com/) or [Netlify Drop](https://app.netlify.com/drop) — drag the folder in, get a URL) and open that URL in your phone's browser. This also unlocks install-to-home-screen (see below), which requires HTTPS or `localhost` — it won't work over a plain `file://` link.

Progress is saved automatically to the browser's `localStorage` on that device — no server, no sign-in, nothing to lose if you close the tab.

## Install it (PWA)

Plate Chase is an installable Progressive Web App: once it's served over HTTPS (or `localhost`), it can be added to a home screen and works fully offline afterward.

- **iOS Safari:** Share → *Add to Home Screen*
- **Android Chrome:** menu → *Install app* (or the install banner that appears automatically)
- **Desktop Chrome/Edge:** install icon in the address bar

After the first visit, a service worker caches the whole app shell, so it keeps working with no signal — handy in the car. Progress still lives in `localStorage`, independent of the cache.

If you change `index.html`, `styles.css`, `app.js`, or `data.js`, bump `CACHE_VERSION` in [`sw.js`](sw.js) so installed devices pick up the update on next launch.

## How to play

1. Tap a state or province on the map to see its license plate and four quick facts.
2. Spot that plate on the road? Tap **"I spotted it!"** — USA states get a honk and confetti, Canadian provinces/territories get a goal-horn blast and falling maple leaves — and the tile lights up on the map.
3. Watch your stats climb: percent complete, fastest back-to-back spot, average pace, best day, and longest hunt.
4. Find everything in your current mode for the grand finale.

Tapped a plate by mistake? Reopen it and use the "oops — remove this find" link. The 🔄 button in the top bar starts a brand-new trip across both regions (with a confirmation, since it clears everything). The 🔊 button mutes the sounds if they stop being charming around hour three.

### USA or USA + Canada

The 🍁 button in the top bar opens the region picker: **USA Only** (50 states) or **USA + Canada** (50 states + 13 provinces/territories). Switching is non-destructive — USA and Canada finds are tracked independently, so toggling back and forth never loses a spot you've already made; it just changes what's currently visible and counted toward your stats.

## Features

- **Tile map** of all 50 states (plus, in USA + Canada mode, all 13 Canadian provinces/territories in their own map block), laid out geographically, tap-to-inspect
- **Stylized license plate graphics** in each state/province's real plate colors and slogan
- **Four facts per plate**: capital, population, state/provincial bird, and statehood year or year joined Confederation
- **Region-specific celebrations**: a synthesized two-tone car horn + confetti for USA finds; a real recorded goal-horn clip + falling maple leaves for Canada finds
- **Stats dashboard**: progress ring, split USA/Canada spotted counters, trip time, fastest spot, average pace, best day, longest gap — all scoped to whichever region(s) are currently active
- **Region progress bars**: West, Midwest, South, Northeast, plus Canada when enabled
- **Trip log**: every find timestamped and numbered, with the gap since the previous one, color-coded by country when both regions are active

## Tech

Plain HTML, CSS, and JavaScript — no frameworks, no build step, no CDNs. Almost everything (data, graphics, the USA horn) is generated in-browser; the one exception is the Canada goal-horn sound, a real recorded clip (free-use license, sourced from Pixabay) bundled locally as a static asset — same self-contained, offline-capable approach as everything else, just not synthesized.

```
index.html     structure
styles.css     look & feel
data.js        state/province data (capitals, populations, birds, plate colors, map coordinates)
app.js         game logic, rendering, storage, sound, service worker registration
manifest.json  PWA metadata (name, icons, theme colors, display mode)
sw.js          service worker — caches the app shell (including sounds/) for offline play
icons/         app icons (regular + maskable, multiple sizes)
sounds/        canada-horn.mp3 — the Canada goal-horn clip (first ~4s of the file is the clean single burst)
```

## Local development

There's no build process — edit the files and reload. If your browser blocks `file://` access to local scripts, serve the folder with any static file server, for example:

```powershell
# PowerShell, no extra tools needed
python -m http.server 8123   # if Python is available
# or use IIS Express, `npx serve`, VS Code Live Server, etc.
```

Then open `http://localhost:8123/`.
