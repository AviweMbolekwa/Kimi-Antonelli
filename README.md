# Kimi Antonelli — GRID01 Racing Systems

Racing-driver showcase in the spirit of landonorris.com: a WebGL hero (depth-parallax portrait + 3D helmet that burns in and follows the cursor), a loading veil, a pinned "message from Kimi" beat (the hero shrinks into a frame, quote marquees, hand-drawn signature), sticky stacked sections, an animated race-lap map, a parallax timeline, a stats/calendar "paddock" section and a contour-line footer.

Stack: Vite + vanilla JS (ES modules) + [Three.js](https://threejs.org) 0.185 + [Lenis](https://github.com/darkroomengineering/lenis). No GSAP. Animation runs on a custom spring solver and one shared requestAnimationFrame loop.

## Run

```bash
npm install
npm run dev      # local dev server
npm run build    # production build in dist/
npm run preview  # serve dist/
```

## Deploy (GitHub Pages)

`.github/workflows/deploy.yml` builds and publishes the site on every push to `main` (or run it by hand from the Actions tab). It builds with `BASE_PATH=/<repo>/`, so the site works at `https://<user>.github.io/<repo>/`. One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

To test the Pages build locally: `BASE_PATH=/Kimi-Antonelli/ npm run build && BASE_PATH=/Kimi-Antonelli/ npm run preview`, then open `/Kimi-Antonelli/`.

Assets are served from `public/assets/`. To serve them from a CDN instead, build with `VITE_ASSET_BASE_URL=https://your-cdn/path npm run build`.

## Structure

```
index.html                 static markup: hero, season, stack wrappers; later sections are filled by JS
public/assets/             images, HDR, helmet .glb, masks (hero/, timeline/, paddock/, footer/)
public/draco/              Draco decoder for the compressed helmet model
src/
  main.js                  entry: side-effect modules first, then initX() per section
  styles/
    base/                  tokens, adaptive-root, reset, text, asset-error
    components/cta.css     angled CTA with flood fill
    effects/chequer.css
    sections/              stack, hero, hero-message, veil, menu-sheet, season, timeline, paddock, footer
  js/
    config.js              ASSET_BASE_URL, asset(path)
    utils/                 dom ($, $$, mq, REDUCED, COARSE), math, css-units (px -> cqw), read-token, markup
    core/
      ticker.js            the one RAF loop: subscribe(cb, rate)
      spring.js            Spring class, presets C, tween()
      smooth-scroll.js     Lenis
      asset-errors.js      data-src hydration + visible error banner
      adaptive-root.js     root font scaling above 1920px
    animations/
      entrances.js         rise / fade / grow (return Springs)
      text.js              split / reveal / headLines (word & letter reveals)
      view-gates.js        onView (enter/leave), loopInView
      scrub.js             scroll-progress scrubbing
    effects/               chequer (flag dissolve), contour (marching squares)
    hero-scene/            HeroScene class, shaders, constants/params, device tiers
    season/                lap trace renderer, map SVG builder, halftone dots
    data/                  track/map geometry, lap path, packed dot lattice
    sections/              stack, menu-sheet, veil, hero, hero-message, season, timeline, paddock, footer
```

## How the pieces work

**One loop.** Everything animated subscribes to `core/ticker.js`. `subscribe(cb, rate)` returns an unsubscribe function, and `rate` throttles it (e.g. the scrub stepper runs every 10ms, the hero scene caps at 60fps on non-desktop tiers). The loop stops itself when nothing is subscribed.

**Springs.** `new Spring(from, C.PRESET, onValue)` then `.set(to, delayMs)`. Presets in `core/spring.js` (`C.REVEAL`, `C.ROW`, `C.FIGURE`, …) use react-spring's `tension`/`friction`. The entrance helpers (`rise`, `fade`, `grow`) and the text helpers (`reveal`, `headLines`) are thin wrappers that return objects with `.set()` or `.play()`/`.back()`.

**Section choreography.** Each `sections/*.js` builds its pieces, then wires them to `onView(section, enter, leave)`. `enter` plays everything with hand-tuned delays; `leave` (scrolling back up past it) reverses. Delays are in ms, so to retime a section, edit the numbers in its `onView` call.

**Scroll-linked motion.** `scrub(el, 'top_bottom', 'bottom_top', p => ...)` gives progress 0→1 between two "element-edge_viewport-edge" positions, much like a GSAP ScrollTrigger scrub. It's used for parallax (timeline plates, paddock and footer figures), the chequered dissolve, and the timeline rail.

**Sizing.** Sections use container queries. `px(v)` in `utils/css-units.js` converts a value from the 1440px design artboard into `cqw`, so layouts scale with their container. Breakpoint overrides are CSS custom properties set in media queries (see the long `--*` lists in `paddock.css` and `footer.css`).

**The hero scene** (`hero-scene/HeroScene.js`):
- The portrait is a plane with diffuse/depth/alpha/normal maps; `headFragment` offsets UVs by depth for parallax and relights from the pointer.
- The helmet `.glb` sits on a pivot that yaws and pitches toward the pointer. Its material gets an injected reveal mask (`injectRevealMask`): it "burns in" from the top on load and is revealed along the cursor trail.
- The cursor trail is a ring buffer of `samples` points passed to the shaders as a uniform array. `uPace` (pointer speed) gates it, so slow movement shows little.
- The backdrop is a full-screen plane drawing animated contour lines (`buildBackdropFragment`).
- `tier.js` scales quality: DPR, antialiasing, trail samples, outline and reveal are reduced or off on tablet/mobile. On mobile with data-saver, or with reduced motion, it freezes after load.
- Tune almost everything through `DEFAULT_PARAMS` in `hero-scene/constants.js`.
- If WebGL is missing or a load fails, `sections/hero.js` swaps in a static image fallback.

**The veil** fills the helmet silhouette to 70% while loading and to 100% when `HeroScene.onReady` fires, then fades and triggers the hero entrance (`handover`).

**Message from Kimi** (`sections/hero-message.js`). The hero's layer (`.hero-layer`) is 400lvh tall and sticky, so the hero stays pinned for three viewports before the season layer slides over. Progress comes from how far the next layer has travelled. Over that range the hero's own `clip-path` shrinks it from full bleed to a framed card over a dark contour field, the hero UI fades out, two quote marquees fade in behind it, and then the slash and signature strokes draw in (`pathLength="1"` + dash offset) while the hero greys out. `sections/hero.js` keeps rendering the 3D scene until the layer is covered. The beat timings are in `BEATS`, the card sizes in `FRAMES`, and the quote copy and signature paths in `QUOTE` and `STROKES` at the top of the file.

**Season map.** The lap is drawn to a canvas (`season/lap.js`): a 6s ease-in-out-sine run that slows in corners (curvature-weighted timing), with a hot gradient head, a spark and marker pops. After the lap, the halftone dot map (`season/dots.js`) arms and reacts to the mouse with a crosshair reticle.

## Reusing parts in another project

- **Spring + ticker engine:** `core/ticker.js`, `core/spring.js`, `utils/math.js`. No dependencies.
- **Text reveals:** add `animations/text.js` + `styles/base/text.css`.
- **Scroll scrub:** `animations/scrub.js` (+ ticker).
- **Sticky stacked sections:** `sections/stack.js` + `styles/sections/stack.css`, plus markup with `.stack > .layer[data-layer] > .layer-inner` and `.shade`.
- **Chequered dissolve / contour backdrop:** `effects/chequer.js`, `effects/contour.js`. These need `utils/read-token.js` for colours.
- **Cursor-trail reveal shader:** `revealTrailFunction` and `buildRevealDeclarations` in `hero-scene/shaders.js`, plus the trail ring buffer and `writeTrailBounds` in `HeroScene.js`.

## Notes

- The serif marquee line in the message beat uses Instrument Serif.
- Content (timeline entries, calendar, stats, nav links) lives as data arrays at the top of each section module.
- `RGBELoader` logs a deprecation warning in Three 0.185 (it suggests `HDRLoader`). It works as-is. This was left unchanged to match the original.
