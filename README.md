# Plate Chase 🚗

The Great American License Plate Hunt — a road-trip game for the whole family. Spot a state's license plate, tap it on the map, and log your find. No installs, no accounts, no backend.

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

1. Tap a state on the map to see its license plate and four quick facts (capital, population, state bird, statehood).
2. Spot that state's plate on the road? Tap **"I spotted it!"** — you'll get a honk, some confetti, and the state lights up green on the map.
3. Watch your stats climb: percent complete, fastest back-to-back spot, average pace, best day, and longest hunt.
4. Find all 50 for the grand finale.

Tapped a state by mistake? Reopen it and use the "oops — remove this find" link. The 🔄 button in the top bar starts a brand-new trip (with a confirmation, since it clears everything). The 🔊 button mutes the horn if it stops being charming around hour three.

## Features

- **Tile map** of all 50 states, laid out geographically, tap-to-inspect
- **Stylized license plate graphics** in each state's real plate colors and slogan
- **Four facts per state**: capital, population, state bird, statehood year/order
- **Synthesized car horn** (Web Audio API — no sound files) + confetti on every find
- **Stats dashboard**: progress ring, trip time, fastest spot, average pace, best day, longest gap
- **Region progress bars**: West, Midwest, South, Northeast
- **Trip log**: every find timestamped and numbered, with the gap since the previous one

## Tech

Plain HTML, CSS, and JavaScript — no frameworks, no build step, no external assets or CDNs. Everything (data, sound, graphics) is generated in-browser, which keeps it lightweight and lets it run identically on Windows, Mac, iOS, and Android.

```
index.html     structure
styles.css     look & feel
data.js        state data (capitals, populations, birds, plate colors, map coordinates)
app.js         game logic, rendering, storage, sound, service worker registration
manifest.json  PWA metadata (name, icons, theme colors, display mode)
sw.js          service worker — caches the app shell for offline play
icons/         app icons (regular + maskable, multiple sizes)
```

## Local development

There's no build process — edit the files and reload. If your browser blocks `file://` access to local scripts, serve the folder with any static file server, for example:

```powershell
# PowerShell, no extra tools needed
python -m http.server 8123   # if Python is available
# or use IIS Express, `npx serve`, VS Code Live Server, etc.
```

Then open `http://localhost:8123/`.
