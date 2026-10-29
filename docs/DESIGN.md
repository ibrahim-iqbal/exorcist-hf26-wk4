# Design spec

How Exorcist is put together: the scan pipeline, the UI state machine, and the
scoring model. For the "why" behind the project, see the [README](../README.md).
For user-facing content (FAQ, privacy, limits), see the in-app [About page](../src/components/About.tsx).

## Scan pipeline

`src/lib/scanner.ts` runs one linear pipeline per scan, reporting progress at
each phase so the UI can animate it:

```
parse → load model → fetch npm metadata → fetch bundle sizes
      → embed descriptions → run 7 analyzers → score
```

1. **Parse** (`parsePackageJson`) — validates the file is a JSON object with
   `dependencies`/`devDependencies` as string-version maps. Anything else
   throws before any network call happens.
2. **Load model** (`loadModel`, 120s timeout) — downloads EmbeddingGemma 300M
   (ONNX, via `@huggingface/transformers`, WASM runtime) once per browser
   session. **If this fails or times out, the scan continues anyway** —
   `modelAvailable` flips to `false` and the two embedding-based checks
   (Possessions, Resurrection) are skipped later. No other phase depends on
   the model.
3. **Fetch npm metadata** (`fetchAllPackageInfo`, concurrency 6) — one
   registry lookup per dependency, batched to stay polite. Throws only if
   *zero* packages resolve (total registry outage); partial failures are
   tolerated per-package.
4. **Fetch bundle sizes** (`fetchAllBundleSizes`, concurrency 4) — Bundlephobia
   lookups. Missing data for a package just skips that package's bloat check.
5. **Embed descriptions** (`embedBatch`) — only runs if the model loaded.
   Each package's npm description becomes a 256-dim vector (Matryoshka
   truncation) for cosine-similarity comparisons.
6. **Run the 7 analyzers** (`src/lib/analyzers.ts`), each independent and
   given exactly the data it needs:

   | Analyzer | Category | Needs |
   |---|---|---|
   | `checkPossessions` | duplicates | embeddings |
   | `checkDead` | deprecated | registry |
   | `checkDormant` | stale 2y+ | registry |
   | `checkCursed` | license | registry + project license |
   | `checkBloated` | bundle size | bundle sizes |
   | `checkAncient` | outdated majors | versions + registry |
   | `checkResurrection` | alternatives | dead+dormant findings, embeddings |

   Resurrection runs last because it needs the Dead and Dormant findings as
   input — it's the only analyzer with a dependency on another analyzer's
   output.
7. **Score** (`calculateHealthScore`) — severity penalties
   (critical −10 / warning −5 / info −2), capped per category so one noisy
   check can't tank the score alone, then scaled down for larger projects
   (`scale = max(0.65, 1 − log10(deps/10) × 0.27)` past 10 deps). Full table
   in the [README](../README.md#how-the-score-is-calculated).

Everything above runs in the browser tab. The only network calls are the
model download, npm registry, and Bundlephobia — all public and anonymous.
See the About page's [Privacy section](../src/components/About.tsx) for the
exact claim.

## UI state machine

`src/App.tsx` drives a single `phase` state through the whole app — no router,
since it's one flow with one branch point (results vs. error):

```
idle → scanning → judging → leaving → results
  ↓                                      ↓
error ←───────────── (scan throws) ──────┘ (user clicks "New scan")
```

- **idle** — landing page, waiting for a file drop, click, or GitHub URL.
- **scanning** — `runScan` is running; `ScanState` streams phase/progress/message
  into the summoning-circle UI via a progress callback.
- **judging** — the scan finished; the circle fills to the final score and a
  bell sound plays (`useSound`). Held for ~1.3s (skipped if
  `prefers-reduced-motion`).
- **leaving** — landing page fades out (~500ms) before the results screen
  mounts, so the transition doesn't pop.
- **results** — the toe-tag card, category bands, and share/export UI.
- **error** — scan threw (bad JSON, registry unreachable, etc.); shows the
  error inline on the landing page, not a separate screen.

A separate `about` phase (added after the initial build) is layered on top:
`openAbout`/`closeAbout` stash the phase you were on before navigating away
and restore it on Back, so scanning state isn't lost if someone glances at
the About page mid-scan.

Two other pieces of state ride alongside `phase` rather than inside it,
because they're independent of where you are in the flow: `theme`
(`useTheme`, persisted) and `lantern`/`soundOn` (ambient toggles, not
persisted).

## Component map

```
App.tsx (phase state machine)
├─ Shell.tsx            — the poster canvas: parallax lantern, candles,
│                          blood-drip decor, the SVG blood pool footer
├─ Landing.tsx           — idle/scanning/error UI, file drop, GitHub URL
├─ Results.tsx           — toe-tag card, category bands, case notes, share
└─ About.tsx             — standalone page, not inside Shell: About/FAQ/
                           Privacy/Limits/Credits
```

`Shell` and `About` deliberately diverge in structure: `Shell` is an absolute-
positioned "scene" sized to a fixed canvas and zoomed to fit the viewport
(`calcZoom`), built for the landing/results screens where layout is
choreographed pixel-by-pixel. `About` is a normal-flow scrollable page —
content-heavy text doesn't want a fixed canvas. It borrows just the header
language (cross-icon wordmark, blood top-edge, grain/dust texture) to stay
visually consistent without inheriting Shell's layout constraints.

## Theming

Everything is CSS custom properties on `:root` and `html[data-theme="light"]`
in `src/index.css` — no CSS-in-JS theme object, no Tailwind dark: variants for
the bespoke poster UI (Tailwind is used only for a handful of utility spots).
Components read `--blood`, `--text`, `--rgb-blood`, etc. directly, so the
light/dark swap is a single attribute flip with no component re-render logic.

## What's not here

Deliberately out of scope for this spec — see the README's "Honest limits"
and "Contributing" sections instead: lockfile analysis, lockfile-based
transitive dependency checks, lottie/loading polish decisions, and anything
about hosting/CI (that's `render.yaml`, not a design decision).
