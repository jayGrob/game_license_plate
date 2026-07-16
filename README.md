# Plate Chase 🚗

The Great American License Plate Hunt — a road-trip game for the whole family. Spot a state's license plate, tap it on the map, and log your find. No installs, no accounts, no backend.

## Play it

Just open [`index.html`](index.html) in a browser. That's it.

- **Desktop/laptop:** double-click the file.
- **Phone/tablet:** loose local files are awkward to open on mobile, so host the folder somewhere reachable (e.g. [GitHub Pages](https://pages.github.com/) or [Netlify Drop](https://app.netlify.com/drop) — drag the folder in, get a URL) and open that URL in your phone's browser.

Progress is saved automatically to the browser's `localStorage` on that device — no server, no sign-in, nothing to lose if you close the tab.

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
index.html   structure
styles.css   look & feel
data.js      state data (capitals, populations, birds, plate colors, map coordinates)
app.js       game logic, rendering, storage, sound
```

## Local development

There's no build process — edit the files and reload. If your browser blocks `file://` access to local scripts, serve the folder with any static file server, for example:

```powershell
# PowerShell, no extra tools needed
python -m http.server 8123   # if Python is available
# or use IIS Express, `npx serve`, VS Code Live Server, etc.
```

Then open `http://localhost:8123/`.
