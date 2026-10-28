# Contributing

Thanks for helping make the web a little more glassy.

## Setup

```sh
git clone https://github.com/Sasivisvan/Glass-Morphism.git
cd Glass-Morphism
npm run dev        # builds dist/ and serves http://localhost:8931
```

There are no dependencies. Node 18+ is enough for the build script, and Python 3 for the dev server (any static server works).

## Layout

| Path | What's there |
| --- | --- |
| `src/` | Library source: `liquid-glass.js` (engine, presets, components), `liquid-glass-gl.js` (WebGL), `liquid-glass.css`, type definitions |
| `dist/` | Built files. Run `npm run build` after editing `src/` and commit both. |
| `demo/` | The showcase site. Pages load the library from `../dist/`. |
| `docs/` | Documentation and README images |

## Guidelines

- **Test in Chromium and in Firefox or Safari.** Refraction is Chromium-only, so check the fallback still looks like glass.
- **Keep it dependency-free** and readable. The math is commented on purpose.
- **Check accessibility:** keep native inputs underneath custom controls, keep focus rings visible, and respect `prefers-reduced-transparency` / `prefers-reduced-motion`.
- **Mind performance:** map rebuilds happen on resize, so prefer transforms for animation.
- For visual changes, include a before/after screenshot in the pull request.

## Reporting bugs

Open an issue with your browser and version, what you expected, what you saw, and ideally a minimal HTML snippet.
