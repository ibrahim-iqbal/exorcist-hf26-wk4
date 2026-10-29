---
title: "Exorcist: a ghost hunter for your package.json"
published: false
tags: hf26challenge, devchallenge, opensource, webdev
ai_disclosure_level: some_ai
cover_image: https://raw.githubusercontent.com/ibrahim-iqbal/exorcist-hf26-wk4/main/docs/screenshots/dev-cover.png
---

*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 4: Ghost in the Machine](https://dev.to/challenges/hacktoberfest-week4-2026-10-26)*

## What I Built

**Exorcist** is a dependency health scanner for `package.json` — the checks
`npm audit` doesn't run. Drop in a file (or paste a GitHub repo URL) and it
finds the slow rot every Node project accumulates: deprecated packages,
functional duplicates nobody noticed they installed twice, packages a major
version or more behind, oversized bundles, copyleft licenses hiding in a
permissive project, and dependencies with no publish in two years. It rolls
everything into a single 0–100 health score and tells you what to do about
each finding.

For the theme — *Ghost in the Machine* — I leaned all the way in: a Victorian
broadside-poster UI, a blood-drip ceiling, flickering candles, a lantern that
follows your cursor, and a results screen presented as a morgue toe-tag.
Findings are "spirits" (Dead, Dormant, Cursed, Ancient, Bloated, Possessed,
and Resurrection for the alternatives it suggests). It's a bit much. That was
the point.

## Demo

**Live:** [https://exorcist-hf26-wk4.onrender.com](https://exorcist-hf26-wk4.onrender.com)

Click **"Try a demo tome"** on the landing page to scan a deliberately haunted
`package.json` — it has lodash+underscore duplicates, deprecated `left-pad`
and `request`, and a few other dependency sins, so you can see every check
fire without hunting down a real cursed project first.

No login, no setup, no data leaves your browser — see Privacy below.

![Landing page — the summoning circle awaits your package.json](https://raw.githubusercontent.com/ibrahim-iqbal/exorcist-hf26-wk4/main/docs/screenshots/landing-dark.jpg)

![Results — the toe-tag verdict card with a health score and condition rating](https://raw.githubusercontent.com/ibrahim-iqbal/exorcist-hf26-wk4/main/docs/screenshots/results-dark.jpg)

![Findings breakdown — Dead Spirits, Cursed Licenses, Ancient Spirits, Bloated bundles, and more](https://raw.githubusercontent.com/ibrahim-iqbal/exorcist-hf26-wk4/main/docs/screenshots/findings-dark.jpg)

![About page — FAQ, privacy policy, honest limits, and credits](https://raw.githubusercontent.com/ibrahim-iqbal/exorcist-hf26-wk4/main/docs/screenshots/about-dark.jpg)

## Code

{% embed https://github.com/ibrahim-iqbal/exorcist-hf26-wk4 %}

```bash
git clone https://github.com/ibrahim-iqbal/exorcist-hf26-wk4.git
cd exorcist-hf26-wk4
npm install
npm run dev
```

MIT licensed. Architecture and the full scan pipeline are written up in
[`docs/DESIGN.md`](https://github.com/ibrahim-iqbal/exorcist-hf26-wk4/blob/main/docs/DESIGN.md)
if you want the "how it actually works" version instead of the pitch.

## How I Built It

The stack: React 19, TypeScript, Vite 8, Tailwind v4 for utility spots, and a
hand-built CSS theming layer (custom properties, no CSS-in-JS) for the poster
UI. Framer Motion and plain CSS keyframes handle the atmosphere — drips,
embers, the cursor-following lantern.

### The scan pipeline

The scan runs entirely in the browser in seven stages:

![Scan pipeline architecture — parse through seven analyzers to health score](https://raw.githubusercontent.com/ibrahim-iqbal/exorcist-hf26-wk4/main/docs/screenshots/scan-pipeline.svg)

Each stage reports progress so the UI can animate the summoning circle in
real time. If any stage fails (model can't load, registry unreachable), the
pipeline degrades gracefully — the checks that needed that data are skipped,
and the rest still run.

### The open-source AI piece

**[EmbeddingGemma 300M](https://huggingface.co/nickmuchi/EmbeddingGemma-300M-ONNX)**
— Google's open-weight embedding model from the Gemma family, running
entirely in-browser via [Transformers.js](https://huggingface.co/docs/transformers.js)
on ONNX Runtime WebAssembly. No API key, no inference server, no per-request
cost. It does two genuine jobs that keyword matching can't:

1. **Duplicate detection.** `lodash` and `underscore` share almost no words
   in their descriptions, but they're functionally the same thing. Exorcist
   embeds every package's npm description and flags pairs above an 82%
   cosine-similarity threshold.
2. **Alternative suggestions.** When a package is dead or dormant, Exorcist
   finds the closest healthy package by embedding distance instead of
   consulting a hardcoded lookup table — if `request` is deprecated, it can
   surface `axios` or `node-fetch` based on what the package actually does.

If the model can't load — offline, low memory, an older browser without
WebAssembly SIMD — the scan degrades gracefully. Those two checks get skipped
and the other five still run. No crash, no blank screen.

The rest of the pipeline (npm registry lookups, Bundlephobia bundle-size
checks, the scoring model) is plain TypeScript with no AI involved — the
model earns its place for the two checks that genuinely need semantic
understanding, not because "AI" sounded good on a feature list.

## Why Does Open Innovation Matter?

Because `package.json` is basically a map of your stack, your exposure, and
how far behind you are on patches — and I didn't want to ask anyone to upload
that to a server to find out if their dependencies were rotten.

An open-weight model running client-side means:

- **Privacy by construction, not by policy.** There's no backend that *could*
  see your file even if I wanted it to. The claim "your data never leaves
  your browser" is checkable in the network tab, not just written in a
  privacy policy.
- **No per-scan cost.** A closed embedding API would do the same duplicate
  detection, but every scan would mean a network call, a cost, and a
  dependency on that endpoint staying up. EmbeddingGemma is a file, not a
  service — run it on every project, every day, for free.
- **Works offline once cached.** After the first load, the full scan
  (minus the npm/Bundlephobia lookups, which are public and anonymous
  anyway) works without internet.
- **Inspectable.** The 82% similarity threshold, the severity weights, the
  category caps on the health score — all of it is in the source, and all of
  it is a number someone can disagree with and change. That's a different
  relationship to the tool than a black-box API returning a score.

Open-weight models made this flow possible without those tradeoffs. That's
the whole pitch for "open innovation" here: the intelligence lives where the
data already is, instead of the data having to travel to where the
intelligence is.

## The Spirit of It

The moment Exorcist stopped feeling like a side project and started feeling
like a real tool was the first time I ran it on one of my own production
`package.json` files — not the demo, not a test fixture, a project I
actually ship.

It found `request`. Deprecated since 2020. Still in my dependencies. I knew
`request` was deprecated — I'd read the notice years ago — but it was still
there, still being installed, still adding weight to every `npm install`,
because no scan I normally run flags "deprecated but functional." I'd walked
past that ghost every day without seeing it.

Then it found that `lodash` and `underscore` were both installed. Different
parts of the codebase pulled them in at different times. They do essentially
the same thing. Nobody noticed because the duplicate isn't visible in a
lockfile diff or a bundle report — you only see it if you compare what the
packages *do*, not what they're *named*. That's the check that needs
embeddings, and that's why I built it.

Exorcist is a tool for the kind of technical debt that hides in plain sight:
not security vulnerabilities or breaking changes, but the slow accumulation
of things that stopped being the right choice sometime between when you
installed them and now. The ghosts in your dependency tree aren't dramatic.
They're just quietly making everything a little heavier, a little slower, a
little harder to maintain — and nobody exorcises them because nobody looks.

Now something does.

## Prize Categories

- **Best Use of Gemma** — EmbeddingGemma 300M (from the Gemma family) runs
  entirely in-browser via Transformers.js/ONNX for semantic duplicate
  detection and alternative package suggestions. No API, no server, no cost.
- **Best Use of Render** — The live demo at
  [exorcist-hf26-wk4.onrender.com](https://exorcist-hf26-wk4.onrender.com)
  is deployed as a Render static site from `render.yaml`, building from
  source on every push.

---

*Built for Hacktoberfest 2026, Week 4: Ghost in the Machine.*
