# Getting started

## 1. Add the files

**CDN (no build step)**

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Sasivisvan/Glass-Morphism@v1.0.1/dist/liquid-glass.css">
<script src="https://cdn.jsdelivr.net/gh/Sasivisvan/Glass-Morphism@v1.0.1/dist/liquid-glass.js"></script>
```

The script defines a global `LiquidGlass`.

**npm**

```sh
npm install @sasivisvan/glass-morphism
```

```js
import LiquidGlass from '@sasivisvan/glass-morphism';
import '@sasivisvan/glass-morphism/css';
```

CommonJS also works: `const LiquidGlass = require('@sasivisvan/glass-morphism')`.

**Copy the files**: everything you need is in [`dist/`](../dist): `liquid-glass.js` (or `.mjs`) and `liquid-glass.css`.

## 2. Put glass over something interesting

Glass only looks like glass when there's detail behind it: photos, text, colour. Over a flat colour, refraction has nothing to bend.

```html
<div class="hero" style="background:url(photo.jpg) center/cover">
  <div class="lg" data-liquid-glass="regular" style="border-radius:32px;padding:24px">
    Hello, glass.
  </div>
</div>
```

## 3. Initialise

```js
LiquidGlass.init();
```

`init()` does two things:

1. Attaches refraction to every element with a `data-liquid-glass` attribute, using the named [preset](api.md#presets).
2. Enhances every [component](components.md) (`.lg-button`, `.lg-switch`, `.lg-slider`, …).

Pass `{ observe: true }` to also pick up elements added later, and `{ light: 'pointer' }` to make highlights follow the pointer.

## 4. Or attach in JavaScript

```js
const el = document.querySelector('.card');
const glass = LiquidGlass.attach(el, 'clear');            // a preset
LiquidGlass.attach(el, { preset: 'clear', bezel: 28 });   // a preset + overrides
LiquidGlass.attach(el, { bezel: 20, thickness: 24, blur: 1, chromatic: .1 }); // raw options

glass.update({ magnify: .2 }); // change it later
LiquidGlass.detach(el);        // remove it
```

The glass reads its corner radius from CSS and rebuilds itself when the element resizes.

## Browser support

| Browser | Result |
| --- | --- |
| Chrome, Edge, Brave, Arc, Opera (Chromium) | Full refraction, specular rims, dispersion |
| Firefox, Safari | Frosted blur fallback with the same rim highlights and interactions |
| No JavaScript | The CSS alone gives a frosted glass surface |

`LiquidGlass.supported` tells you which path is active. For refraction in every browser, use the [WebGL renderer](api.md#webgl-renderer).

## Gotchas

- **Backdrop roots.** An element with `filter`, `opacity < 1`, `mask`, `clip-path`, `mix-blend-mode` or its own `backdrop-filter` becomes a *backdrop root*: glass inside it only sees content inside that ancestor. Don't fade or filter a container that holds glass. Animate the glass elements themselves instead.
- **Nested glass** sees only what its glass parent paints. The components use this on purpose: a tab bar's selection lens sits after the tab items so it magnifies them.
- **Resizing is the expensive part.** Every size change rebuilds the displacement map. Transforms (`scale`, `translate`) are free, so animate those when you can.
- **Glass can't bend what's outside its bounds.** `backdrop-filter` only receives the pixels directly behind the element.
- **Use real content behind it.** Thin CSS gradient lines survive less well than images and text.
